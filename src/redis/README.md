# Redis & Scalable Socket Architecture - Low Level Design (LLD)

This document provides a deep dive into the architectural decisions made for the Redis maturity and WebSocket scaling implementation.

---

## 1. Why use a Cache Decorator?
### The Problem:
Without a decorator, every service method that needs caching must manually:
1. Construct a cache key.
2. Check if the key exists in Redis.
3. Return the value if found.
4. If not found, execute the business logic.
5. Save the result back to Redis.
6. Handle complex JSON serialization.

This leads to significant **boilerplate code** scattered across your services, making them harder to read and maintain.

### The Solution: `@Cacheable`
The decorator acts as a **Higher-Order Function** (Middleware for methods). It abstracts all the caching logic away from your business logic.
- **Task**: Intercept the method call, manage the key generation, handle the async Redis I/O, and automatically serialize/deserialize results.
- **Benefit**: You can add powerful caching to any method by simply adding one line: `@Cacheable({ ttl: 3600 })`.

---

## 2. Redis Module and Pub/Sub: Why and How?

### Why Redis?
Redis is an in-memory data store. Unlike a traditional database (Postgres), it is extremely fast (sub-millisecond latency) because it operates in RAM. This makes it ideal for:
1. **Caching**: Storing frequently accessed data to reduce DB load.
2. **Pub/Sub**: Passing messages between different server instances.

### What is the purpose of Pub/Sub?
Pub/Sub stands for **Publish/Subscribe**. It is a messaging pattern where a "Publisher" sends a message to a "Channel", and any number of "Subscribers" listening to that channel receive it.

### How does it scale our WebSocket server?
In a modern application, you might have **Server Instance A** and **Server Instance B** running behind a load balancer.
- **The Issue**: User 1 is connected to Server A. User 2 is connected to Server B. If User 1 sends a message to User 2, Server A doesn't "know" where User 2 is. It only knows about the users connected to *itself*.
- **The Solution**: Pub/Sub acts as a **Global Backbone**. When Server A wants to send a message to User 2, it publishes the message to a Redis channel. Both Server A and Server B are subscribers. Server B receives the message via Redis, sees that User 2 is connected to it, and delivers the message via its local socket.

---

## 3. The Redis-IO-Adapter: The "Glue"

### Why do we need `RedisIoAdapter`?
This adapter is the implementation of the Pub/Sub logic for Socket.io. It bridges the local `socket.io` server with the global Redis instance.

### What if we don't use it?
If you don't use a Redis adapter:
- **Server Isolation**: Your socket servers remain "silos". Users on Server A cannot talk to users on Server B.
- **Scaling Limit**: You can never scale beyond a single server instance without breaking the messaging functionality of your app.

### How are Socket Gateways connected with Pub/Sub?
The connection happens at the **Adapter Layer**:
1. **Bootstrap**: In `main.ts`, we tell the NestJS application to use `RedisIoAdapter` instead of the default memory-based adapter.
2. **Gateway Initialization**: When the `SocketGateway` starts, the adapter creates two Redis clients (Publisher and Subscriber).
3. **Event Flow**: Every time you call `this.server.to(room).emit(event, data)`, the adapter automatically translates that into a Redis Publish command. Every instance of your app is listening to Redis and picks up the broadcast to deliver it to its locally connected sockets.

---

## 4. Implementation Details in `RedisService`

We use **three separate Redis Clients** in `RedisService`:
1.  **Main Client**: Used for standard GET/SET/DEL operations. It's dedicated to data storage.
2.  **Publisher Client**: Dedicated to sending messages.
3.  **Subscriber Client**: Dedicated to listening for messages.

**Why three?**
Redis Subscribers enter a "subscriber mode" where they can *only* listen for messages. They cannot perform normal SET/GET commands. By separating them, we ensure that subscribing to a channel doesn't block your ability to cache data or publish new events.

---

## 5. Summary of Workflow

1.  **Request comes in**: A service method decorated with `@Cacheable` is called.
2.  **Cache Check**: `RedisService` checks the "Main Client" for a value.
3.  **Socket Event**: A user sends a message. `SocketGateway` receives it.
4.  **Scaling**: `SocketService` calls `server.to(receiverId).emit()`.
6.  **Delivery**: All server instances receive the event; the instance holding the receiver's connection sends it down the WebSocket.

---

## 6. Login Optimization (Efficient Strategy)

### The Problem:
Every time a user logs in, the application fetches their profile, address details, and other relations from the database. This creates a high volume of repetitive queries during peak traffic.

### The Solution:
We use **Layered Caching** in the `AuthService`:
1.  **Decorated Fetch**: The `userInfo` method is decorated with `@Cacheable`.
2.  **Fast Retrieval**: On login, after password verification, the system checks Redis for the `user_info:{userId}` key.
3.  **Consistency (Invalidation)**: To ensure data is always fresh, the `UserService` is wired to automatically delete the Redis key whenever a user's profile, image, or account settings are updated.

This ensures that login is **O(1)** from Redis in most cases, significantly reducing the load on your primary database.
