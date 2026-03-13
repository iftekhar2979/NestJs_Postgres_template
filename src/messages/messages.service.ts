import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AttachmentService } from "src/attachment/attachment.service";
import { ResponseInterface } from "src/common/types/responseInterface";
import { ConversationsService } from "src/conversations/conversations.service";
import { Conversations } from "src/conversations/entities/conversations.entity";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { pagination } from "src/shared/utils/pagination";
import { SocketService } from "src/socket/socket.service";
import { User } from "src/user/entities/user.entity";
import { UserService } from "src/user/user.service";
import { Repository } from "typeorm";
import { Logger } from "winston";
import { SendMessageDto } from "./dto/send-message.dto";
import { Messages } from "./entities/messages.entity";

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Messages)
    private _messageRepo: Repository<Messages>,
    private readonly _conversationService: ConversationsService,
    private readonly _userService: UserService,
    private readonly _attachmentService: AttachmentService,
    private readonly _socketService: SocketService,
    @InjectLogger() private readonly _logger: Logger
  ) {}

  async sendMessage(dto: SendMessageDto): Promise<Messages> {
    try {
      const conversation = await this._conversationService.getConversationId(dto.conversation_id);
      const message = this._messageRepo.create({
        msg: dto.msg,
        type: dto.type ? dto.type : "text",
        sender: dto.sender,
        conversation,
        isRead: false,
      });

      this._logger.log("Message Service", message);
      const savedMessage = await this._messageRepo.save(message);

      if (dto.attachments?.length) {
        await this._attachmentService.addAttachments(savedMessage, dto.attachments);
        return this._messageRepo.findOneOrFail({
          where: { id: savedMessage.id },
          relations: ["attachments"],
        });
      }

      return savedMessage;
    } catch (error) {
      console.log(error);
    }
  }
  async seenMessages({ conversation_id }: { conversation_id: number }) {
    const updateResult = await this._messageRepo
      .createQueryBuilder()
      .update(Messages)
      .set({ isRead: true })
      .where("conversation_id = :conversation_id", { conversation_id })
      .andWhere("isRead = false")
      .execute();

    return {
      message: `${updateResult.affected} message(s) marked as read`,
    };
  }
  async sendFileAsMessageWithRest({
    conversation_id,
    user,
    imageUrls,
    receiver,
  }: {
    conversation_id: number;
    receiver: User;
    user: User;
    imageUrls: string[];
  }) {
    const attachments = (imageUrls || []).map((url) => ({
      file_url: url,
      file_type: "image/jpeg", // Defaulting to image/jpeg
    }));

    const msg = await this.sendMessage({
      conversation_id,
      sender: user,
      attachments: attachments,
      type: "image",
    });

    await this._conversationService.updatedConversation({ conversation_id, message: msg });
    
    // Using the server instance for room-based broadcast
    if (this._socketService.server) {
      this._socketService.server.to(receiver.id).emit(`conversation-${conversation_id}`, msg);
      this._socketService.server.to(user.id).emit(`conversation-${conversation_id}`, msg);
    }
    
    return msg;
  }
  async getMessages({
    conversationId,
    conversation,
    receiver,
    page = 1,
    limit = 10,
  }: {
    conversationId: number;
    receiver: Partial<User>;
    conversation: Conversations;
    page: number;
    limit: number;
  }): Promise<
    ResponseInterface<{ receiver: Partial<User>; conversation: Conversations; messages: Messages[] }>
  > {
    const [messages, total] = await this._messageRepo.findAndCount({
      where: { conversation: { id: conversationId } },
      relations: ["attachments", "offer"],
      order: { created_at: "DESC" },
      // skip: skip,
      // take: take,
    });
    const lastmsg = messages[messages.length - 1];
    // console.log(receiver, messages[messages.length-1].sender_id)
    if (receiver.id !== lastmsg.sender_id) {
      console.log("receiver and lastmsg sender are not same");
      await this.seenMessages({ conversation_id: conversationId });
    }

    // If no messages are found
    if (messages.length === 0) {
      throw new NotFoundException("No messages found for this conversation");
    }
    return {
      status: "success",
      message: "Messages retrived successfully",
      statusCode: 200,
      data: { receiver, conversation, messages },
      pagination: pagination({ page, limit, total }),
    };
  }
}
