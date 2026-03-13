import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { GetConversation, GetReceiver, GetUser } from "src/auth/decorators/get-user.decorator";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { Conversations } from "src/conversations/entities/conversations.entity";
import { User } from "src/user/entities/user.entity";
import { MessageEligabilityGuard } from "./decorators/message-eligability.guard";
import { MessagesService } from "./messages.service";

@Controller("messages")
export class MessagesController {
  constructor(
    private readonly _messagesService: MessagesService
    // private readonly socketService:SocketService
  ) {}

  @Get(":id")
  @UseGuards(JwtAuthenticationGuard, MessageEligabilityGuard)
  async getMessages(
    @GetReceiver() receiver: User,
    @GetConversation() conversation: Conversations,
    @Param("id") conversationId: number,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10
  ) {
    const response = await this._messagesService.getMessages({
      conversationId,
      receiver,
      conversation,
      page,
      limit,
    });
    return response;
  }
  @Post(":id/file")
  @UseGuards(JwtAuthenticationGuard, MessageEligabilityGuard)
  async sendFile(
    @GetReceiver() receiver: User,
    @Body() body: { conversationId: string, imageUrls: string[] },
    @GetUser() user: User
  ) {
    if (!receiver) {
      throw new BadRequestException("Receiver not found!");
    }
    const conversationId = body.conversationId;
    const response = await this._messagesService.sendFileAsMessageWithRest({
      conversation_id: parseFloat(conversationId),
      user,
      receiver,
      imageUrls: body.imageUrls || [],
    });

    return response;
  }
}
