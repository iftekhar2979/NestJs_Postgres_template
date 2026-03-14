import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ConversationsService } from './src/conversations/conversations.service';
import { Brackets } from "typeorm";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const convService = app.get(ConversationsService);
  
  // Try querying conversations for user "c3bbadbb-7cf6-499d-ad03-3ca4fdd0915f" (from earlier inspection or pick one if you know)
  const usersService = app.get('UserService');
  const users = await usersService.getAllUsers();
  if (!users.length) return console.log("No users in db");
  const userId = users[0].id; // Just pick the first user
  
  console.log("Testing getAllConversations for user:", userId);
  
  // CURRENT BUGGY CODE LOGIC
  const [oldConvs] = await convService['conversationRepo']
    .createQueryBuilder("conversation")
    .leftJoinAndSelect("conversation.participants", "participant")
    .leftJoin("participant.user", "user")
    .addSelect(["user.id", "user.firstName"])
    .where("user.id = :userId", { userId })
    .take(1)
    .getManyAndCount();
    
  console.log("Buggy Result: participants count =", oldConvs[0]?.participants?.length);

  // NEW FIXED CODE LOGIC
  const [newConvs] = await convService['conversationRepo']
    .createQueryBuilder("conversation")
    .innerJoin("conversation.participants", "filter_participant", "filter_participant.user_id = :userId", { userId })
    .leftJoinAndSelect("conversation.participants", "participant")
    .leftJoin("participant.user", "user")
    .addSelect(["user.id", "user.firstName"])
    .take(1)
    .getManyAndCount();
    
  console.log("Fixed Result: participants count =", newConvs[0]?.participants?.length);
  
  await app.close();
}
bootstrap();
