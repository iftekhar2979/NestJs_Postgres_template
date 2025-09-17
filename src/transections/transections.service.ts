import { Pagination, pagination } from 'src/shared/utils/pagination';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transections } from './entity/transections.entity';
import { Repository } from 'typeorm';
import { GetTransactionHistoryDto } from './dto/Get-transection.dto';
import { User } from 'src/user/entities/user.entity';
import { TransectionType } from './enums/transectionTypes';

@Injectable()
export class TransectionsService {
 constructor(
    @InjectRepository(Transections)
    private transectionsRepo: Repository<Transections>,
  ) {}

  async getWalletHistory(filter: GetTransactionHistoryDto,user:User) {
    const {
      wallet_id,
      user_id,
      transection_type,
      status,
      page = 1,
      limit = 10,
    } = filter;

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const qb = this.transectionsRepo.createQueryBuilder('transection')
      .leftJoinAndSelect('transection.user', 'user')
      .leftJoinAndSelect('transection.wallet', 'wallet')
      .leftJoinAndSelect('transection.order', 'order')
      .leftJoinAndSelect('transection.product', 'product')
      .orderBy('transection.created_at', 'DESC')
      .take(take)
      .skip(skip);

    if (wallet_id) {
      qb.andWhere('transection.wallet_id = :wallet_id', { wallet_id });
    }

   if (user_id) {
  qb.andWhere('transection.user_id = :user_id', { user_id });
}
    if (transection_type) {
      qb.andWhere('transection.transection_type = :transection_type', {
        transection_type,
      });
    }

    if (status) {
      qb.andWhere('transection.status = :status', { status });
    }

    const [transactions, total] = await qb.getManyAndCount();

    return {
      message: 'Transaction history retrieved successfully',
      statusCode: 200,
      data: transactions,
      pagination: {
        totalItems: total,
        currentPage: Number(page),
        pageSize: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findAll(page = 1, limit = 10): Promise<{ data: Transections[]; pagination: Pagination, message:'transection retrived successfully!' ,statusCode:200 }> {
  const [data, total] = await this.transectionsRepo.findAndCount({
    relations: ['user', 'wallet', 'order', 'product'],
    order: {
      created_at: 'DESC',
    },
    skip: (page - 1) * limit,
    take: limit,
  });
  return { data,message:'transection retrived successfully!',pagination:pagination({page,limit,total}) ,statusCode:200 };
}
  async getMonthlyEarnings(year: number): Promise<{total:any,data:{ month: string; totalEarnings: number }[]}> {
  const result = await this.transectionsRepo
    .createQueryBuilder('transection')
    .select("EXTRACT(MONTH FROM transection.created_at)", 'month')
    .addSelect('COALESCE(SUM(CAST(transection.amount AS float)), 0)', 'totalEarnings')
    .where("transection.transection_type = :type", {
  type: TransectionType.RECHARGE,
})
    // .where("EXTRACT(YEAR FROM transection.created_at) = :year", { year })
    .groupBy('month')
    .orderBy('month', 'ASC')
    .getRawMany();

    const totalAmount = await this.transectionsRepo.query(`
      SELECT COALESCE(SUM(CAST(amount AS float)), 0) as "totalAmount"
      FROM transections
      WHERE transection_type = $1
    `, [TransectionType.RECHARGE]);

  
console.log("Total amount",totalAmount)
const total = totalAmount[0]
  const monthMap = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'June',
    'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const earningsByMonth: { month: string; totalEarnings: number }[] = [];

  for (let i = 1; i <= 12; i++) {
    const found = result.find(r => Number(r.month) === i);
    earningsByMonth.push({
      month: monthMap[i - 1],
      totalEarnings: found ? parseFloat(found.totalEarnings) : 0,
    });
  }

  return {total,data:earningsByMonth};
}

}
