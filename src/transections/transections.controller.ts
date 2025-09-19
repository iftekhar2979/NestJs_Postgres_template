import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { GetTransactionHistoryDto } from './dto/Get-transection.dto';
import { TransectionsService } from './transections.service';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { JwtAuthenticationGuard } from 'src/auth/guards/session-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles-auth.guard';
import { TransectionType } from './enums/transectionTypes';
import { UserRoles } from 'src/user/enums/role.enum';
import { Roles } from 'src/user/decorators/roles.decorator';

@Controller('transections')
export class TransectionsController {
     constructor(private readonly transectionsService: TransectionsService) {}

  @Get('history')
  @UseGuards(JwtAuthenticationGuard)
  @ApiQuery({ name: 'wallet_id', required: false })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'transection_type', enum: ['CREDIT', 'DEBIT'], required: false })
  @ApiQuery({ name: 'status', enum: ['PENDING', 'COMPLETED', 'FAILED'], required: false })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getWalletHistory(
    @GetUser() user:User,
    @Query() query: GetTransactionHistoryDto
  ) {
    if(user.id){
        query.user_id = user.id
        // query.transection_type = TransectionType. 
    }
    console.log(query)
    return this.transectionsService.getWalletHistory(query,user)
  }

  @Get('withdraws')
  @UseGuards(JwtAuthenticationGuard,RolesGuard)
  @Roles(UserRoles.ADMIN)
  @ApiQuery({ name: 'wallet_id', required: false })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'transection_type', enum: ['CREDIT', 'DEBIT'], required: false })
  @ApiQuery({ name: 'status', enum: ['PENDING', 'COMPLETED', 'FAILED'], required: false })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getWithdrawRequestHistory(
    @GetUser() user:User,
    @Query() query: GetTransactionHistoryDto
  ) {
    query.transection_type = TransectionType.WITHDRAW 
    return this.transectionsService.getWalletHistory(query,user)
  }
  // @Get('')
  // // @UseGuards(JwtAuthenticationGuard,RolesGuard)
  // @ApiQuery({ name: 'wallet_id', required: false })
  // @ApiQuery({ name: 'user_id', required: false })
  // @ApiQuery({ name: 'transection_type', enum: ['CREDIT', 'DEBIT'], required: false })
  // @ApiQuery({ name: 'status', enum: ['PENDING', 'COMPLETED', 'FAILED'], required: false })
  // @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  // @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  // async transectionInfo(
  //   // @GetUser() user:User,
  //   @Query() query: GetTransactionHistoryDto
  // ) {
  //   // if(user.id){
  //   //     query.user_id = user.id
  //   // }
  //   return this.transectionsService.findAll(query.page,query.limit)
  // }


 @Get()
   @UseGuards(JwtAuthenticationGuard,RolesGuard)
  @Roles(UserRoles.USER)
async getAllTransections(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
  @GetUser() user: User,
) {
  let query :any = {}
      if(user.id){
        query.user_id = user.id
        // query.transection_type = TransectionType. 
    }
    console.log(query)
    return this.transectionsService.getWalletHistory(query,user)
}


@Get('earnings')
@ApiQuery({ name: 'year', required: true, type: Number, example: 2025 })
  async getMonthlyEarnings(@Query('year') year: number) {
    return this.transectionsService.getMonthlyEarnings(Number(year));
  }

@Get('statistics')
@ApiQuery({ name: 'year', required: true, type: Number, example: 2025 })
  async getStatistices() {
    return this.transectionsService.getStatistics()
  }
}
