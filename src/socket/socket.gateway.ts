import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketService } from "./socket.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})

export class SocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly _socketService: SocketService) {}

  afterInit(server: Server) {
    this._socketService.server = server;
  }

  handleConnection(socket: Socket): void {
    // console.log(socket)
    this._socketService.handleConnection(socket);
  }

  handleDisconnect(socket: Socket): void {
    this._socketService.handleDisconnection(socket);
  }
}
