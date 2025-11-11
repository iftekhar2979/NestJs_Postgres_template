import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketService } from "./socket.service";

@WebSocketGateway({
  cors: {
    origin: ["https://kisdate.merinasib.shop", "http://localhost:5500"],
    // methods: ["GET", "POST"],
    // credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly _socketService: SocketService) {}

  handleConnection(socket: Socket): void {
    // console.log(socket)
    this._socketService.handleConnection(socket);
  }
}
