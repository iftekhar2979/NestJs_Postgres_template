import { Repository } from "typeorm";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Server } from "http";
// import mongoose, { Model, ObjectId } from 'mongoose';
import { Socket } from "socket.io";
import { Messages } from "src/messages/entities/messages.entity";
import { ParticipantsService } from "src/participants/participants.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { User } from "src/user/entities/user.entity";
import { UserService } from "src/user/user.service";
import { Logger } from "winston";
import { Conversations } from "src/conversations/entities/conversations.entity";

@Injectable()
export class SocketService {
  public io: Socket;
  public connectedClients: Map<string, Socket> = new Map();
  public connectedUsers: Map<string, { name: string; socketID: string }> = new Map();
  private writeInterval: NodeJS.Timeout;
  private readonly swipesCount: Map<string, number> = new Map();
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    // private readonly conversationService:ConversationsService,
    // private readonly messageService:MessagesService,
    @InjectRepository(Messages) private readonly messageRepository: Repository<Messages>,
    @InjectRepository(Conversations) private readonly conversationRepository: Repository<Conversations>,
    private readonly participantService: ParticipantsService,
    @InjectLogger() private readonly logger: Logger
    // @InjectRe(Message.name) private readonly messageModel: Model<Message>,
    // @InjectModel(Conversation.name)
    // private readonly conversationModel: Model<Conversation>,
    // private readonly notificationService: NotificationService,
    // private readonly firebaseService:FirebaseService,
    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // this.writeInterval = setInterval(() => this.flushBufferToDatabase(), 10000);
  }
  afterInit(server: Server) {
    console.log("Socket server initialized");
    server.on("error", (error) => {
      console.error("Socket server error:", error.message);
    });
  }

  async handleConnection(socket: Socket) {
    try {
      const clientId = socket.id;
      const token = socket.handshake.headers.authorization;
      console.log(socket.handshake.query);
      //   console.log(socket.handshake.headers);
      console.log("Connected", socket.id);
      if (!token) {
        throw new UnauthorizedException("You are not authorized to access this resource!");
      }
      const jwt = token.split(" ")[1];
      if (!jwt) {
        throw new UnauthorizedException("You are not authorized to access this resource!");
      }
      //   const payload = this.jwtService.verify(jwt);
      const payload = await this.userService.getUserById(this.jwtService.verify(jwt).id);
      console.warn("Payload", payload);
      if (!payload.firstName) {
        throw new UnauthorizedException("You are not authorized to access this resource!");
      }
      this.connectedUsers.set(payload.id, {
        name: payload.firstName,
        socketID: clientId,
      });

      this.connectedClients.set(clientId, socket);
      socket.on("send-message", (data) => {
        this.handleSendMessage(payload, data, socket);
      });
      socket.on("active-status", () => {
        this.userActiveStatus(payload.id, socket);
        // this.userDisconnect(payload.id, socket);
      });
      this.userActiveStatus(payload.id, socket);
      //   this.userDisconnect(payload.id, socket);
      socket.on("seen", (data: { receiver_id: string; conversation_id: number }) => {
        this.handleMessageSeen(payload.id, data.receiver_id, data.conversation_id);
      });
      // console.log(socket["user"]);
      // when we get a call to start a call
      const user = socket.handshake.query.user as string;
      this.connectedUsers.set(user, {
        name: user,
        socketID: clientId,
      });
      socket.on("offer", ({ to, offer }) => {
        const socketId = this.connectedUsers.get(to)?.socketID;
        console.log("Offer sent to:", to, "From", user, "Socket ID:", socketId);
        socket.to(socketId).emit("offer", { from: socket.id, offer, userId: user });
      });

      socket.on("offer-answer", ({ to, answer }) => {
        const socketId = this.connectedUsers.get(to)?.socketID;
        console.log("Offer answered:", to, "Socket ID:", socketId);
        socket.to(to).emit("offer-answer", { from: socket.id, answer });
      });

      socket.on("ice-candidate", ({ to, candidate }) => {
        const socketId = this.connectedUsers.get(to)?.socketID;
        console.log("Ice Candidate Exachange:", to, "Socket ID:", socketId);
        socket.to(to).emit("ice-candidate", { from: socket.id, candidate });
      });
      // console.log(this.connectedUsers);
      socket.on("disconnect", async () => {
        // await this.userService.updateUserUpdatedTimeAndOfflineStatus({ user_id: payload.id });
        // socket.broadcast.emit(`active-users`, {
        //   message: `${payload.firstName} is offline .`,
        //   isActive: false,
        //   id: payload.id,
        // });
      });
      //   socket.on('call-end', (data) => {
      //     this.handleCallEnd(payload, data, socket);
      //   });
      //   socket.on('swipes', () => {
      //     this.handleSwipesCount(payload, socket);
      //   });
      //   socket.on('disconnect', async () => {
      //     console.warn('disconnected', this.connectedUsers.get(payload.id));
      //     await this.userService.updateUserDateAndTime(payload.id);
      //     this.connectedClients.delete(clientId);
      //     this.connectedUsers.delete(payload.id);
      //     this.userActiveStatus(payload.id, socket);
      //     this.userDisconnect(payload.id, socket);
      //     console.log("Connected User",this.connectedUsers);
      //   });
    } catch (error) {
      // console.log(error)
      console.error("Error handling connection:", error.message);

      socket.disconnect(); // Disconnect the socket if an error occurs
    }
  }
  async handleDisconnection(socket: Socket, userId: string) {
    console.log("Disconnected", socket);
    this.connectedClients.delete(socket.id);
    this.connectedUsers.delete(userId);
  }

  async userActiveStatus(id: string, socket: Socket) {
    const friendsInfo = (await this.participantService.findMyFriends(id)) || [];
    console.log("USER CONNECTION", friendsInfo);
    friendsInfo.forEach((friend: User) => {
      if (this.connectedUsers.get(friend.id)) {
        socket.emit("active-users", {
          message: `${friend.firstName} is online now.`,
          isActive: true,
          id: friend.id,
        });
      }
    });
  }
  getSocketByUserId(userId: string): Socket | undefined {
    console.log(this.connectedUsers);
    const socketID = this.connectedUsers.get(userId)?.socketID;
    return socketID ? this.connectedClients.get(socketID) : undefined;
  }
  joinRoom({ roomkey }: { roomkey: string }) {
    try {
      this.io.join(roomkey);
    } catch (error) {
      console.log(error);
    }
  }
  sendToRoom(roomkey: string, event: string, value: any) {
    this.io.to(roomkey).emit(event, value);
  }
  async handleMessageDelivery({
    senderId,
    receiverId,
    conversation_id,
    message,
  }: {
    senderId: string;
    receiverId: string;
    conversation_id: number;
    message: Messages;
  }) {
    const receiverSocket = this.getSocketByUserId(receiverId);
    const senderSocket = this.getSocketByUserId(senderId);
    console.log(senderSocket, message);
    delete message.conversation;
    delete message.sender;
    if (receiverSocket) {
      receiverSocket.emit(`conversation-${conversation_id}`, message);
    }
    if (senderSocket) {
      senderSocket.emit(`conversation-${conversation_id}`, message);
    }
  }

  async handleSendMessage(
    payload: User,
    data: { conversation_id: number; msg: string },
    socket: Socket
  ): Promise<void> {
    try {
      console.log("Sending Message Event calll", data);
      if (!data.conversation_id || !data.msg || !payload.id) {
        throw new Error("Invalid message data!");
      }
      const conversation_id = data.conversation_id;
      const { sender, receiver, conversation } = await this.participantService.checkEligablity({
        conversation_id,
        user_id: payload.id,
      });
      if (!sender && !receiver) {
        throw new BadRequestException("You are not eligable for this chat .");
      }
      if (payload.id === receiver.id) {
        this.getSocketByUserId(sender.id).emit(
          `error`,
          "Message Delivered Failed!! Because Sender and Receiver are same"
        );
      }
      const message = this.messageRepository.create({
        sender,
        msg: data.msg,
        type: "text",
        conversation,
        isRead: false,
        conversation_id: conversation.id,
      });
      console.log(message);
      this.handleMessageDelivery({
        senderId: sender.id,
        receiverId: receiver.id,
        conversation_id: conversation.id,
        message,
      });
      await this.messageRepository.save(message);
      conversation.lastmsg = message;
      await this.conversationRepository.save(conversation);
      socket.emit(`conversation-${conversation_id}`, message);
    } catch (error) {
      // console.log(error)
      console.error("Error handling send-message:", error.message);
      socket.emit(`error:${data.conversation_id}`, {
        message: "Failed to send message.",
      });
    }
  }

  activeSocket(id: string, message: string, payload: any): void {
    const senderSocket = this.getSocketByUserId(id.toString());
    if (senderSocket) {
      senderSocket.emit(message, payload);
    } else {
      console.log("Socket is not active");
    }
  }
  async handleMessageSeen(sender_id: string, receiver_id: string, conversation_id: number) {
    try {
      //   let lastMessage = await this.messageService.seenMessages({conversation_id})
      const lastMessage = await this.messageRepository
        .createQueryBuilder()
        .update(Messages)
        .set({ isRead: true })
        .where("conversation_id = :conversation_id", { conversation_id })
        .andWhere("isRead = false")
        .execute();
      this.activeSocket(sender_id, `seen-${conversation_id}`, {
        seen: true,
        seenBy: sender_id,
      });
      this.activeSocket(receiver_id, `seen-${conversation_id}`, {
        seen: true,
        seenBy: receiver_id,
      });
    } catch (error) {
      console.log(error);
    }
  }
}
