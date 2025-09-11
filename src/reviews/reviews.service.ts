import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reviews } from './entity/reviews.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { CreateReviewDto, UpdateReviewDto } from './dto/reviews.dto';

@Injectable()
export class ReviewsService {

    constructor(
    @InjectRepository(Reviews)
    private readonly reviewsRepository: Repository<Reviews>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createReviewDto: CreateReviewDto): Promise<Reviews> {
    const { user_id, reviewer, review_msg, rating } = createReviewDto;

    const user = await this.userRepository.findOne({ where: { id: user_id } });
    if (!user) throw new NotFoundException(`User with id ${user_id} not found`);
if(user.id === reviewer.id){
    throw new ForbiddenException("You can't review yourself")
}
    const review = this.reviewsRepository.create({
      user,
      reviewer,
      user_id,
      reviewer_id:reviewer.id,
      review_msg,
      rating,
    });

    return this.reviewsRepository.save(review);
  }

  async findAll(): Promise<Reviews[]> {
    return this.reviewsRepository.find({
      relations: ['user', 'reviewer'],
    });
  }

  async findOne(id: string): Promise<Reviews> {
    const review = await this.reviewsRepository.findOne({
      where: { user:{id} },
      relations: ['user', 'reviewer'],
    });
    if (!review) throw new NotFoundException(`Review with id ${id} not found`);
    return review;
  }

//   async update(id: number, updateReviewDto: UpdateReviewDto): Promise<Reviews> {
//     const review = await this.findOne(id);

//     if (updateReviewDto.user_id) {
//       const user = await this.userRepository.findOne({ where: { id: updateReviewDto.user_id } });
//       if (!user) throw new NotFoundException(`User with id ${updateReviewDto.user_id} not found`);
//       review.user = user;
//       review.user_id = updateReviewDto.user_id;
//     }

//     if (updateReviewDto.reviewer_id) {
//       const reviewer = await this.userRepository.findOne({ where: { id: updateReviewDto.reviewer_id } });
//       if (!reviewer) throw new NotFoundException(`Reviewer with id ${updateReviewDto.reviewer_id} not found`);
//       review.reviewer = reviewer;
//       review.reviewer_id = updateReviewDto.reviewer_id;
//     }

//     if (updateReviewDto.review_msg !== undefined) review.review_msg = updateReviewDto.review_msg;
//     if (updateReviewDto.rating !== undefined) review.rating = updateReviewDto.rating;

//     return this.reviewsRepository.save(review);
//   }

//   async remove(id: number): Promise<void> {
//     const review = await this.findOne(id);
//     await this.reviewsRepository.remove(review);
//   }
}