import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { User, USERSTATUS } from "./entities/user.entity";
import { MailService } from "../mail/mail.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { InjectLogger } from "../shared/decorators/logger.decorator";
import { CreateAdminDto } from "src/auth/dto/create-user.dto";
import { argon2hash } from "src/utils/hashes/argon2";
import { GetUsersQueryDto } from "./dto/get-user.query.dto";
import { UserRoles } from "./enums/role.enum";
import { Verification } from "./entities/verification.entity";
import { pagination } from "src/shared/utils/pagination";
import { UpdateUserProfileDto } from "./dto/update-profile.dto";

/**
 * This service contain contains methods and business logic related to user.
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Verification) private verificationRepo: Repository<Verification>,
    @InjectLogger() private readonly logger: Logger,
    private readonly mailService: MailService
) {}

async getUserFilters(query: GetUsersQueryDto) {
  const { page = 1, limit = 10, search } = query;
  const take = Number(limit);
  const skip = (Number(page) - 1) * take;

  const qb = this.userRepository.createQueryBuilder('user');

qb.where('user.roles @> ARRAY[:role]', { role: UserRoles.USER });

  // Search by firstName or lastName
  if (search) {
    qb.andWhere(
      `(user.firstName ILIKE :search OR user.lastName ILIKE :search)`,
      { search: `%${search}%` },
    );
  }
  if (query.status) {
   qb.where('(user.status ILIKE :status)', { status: query.status });
  }

  // Pagination
  qb.take(take).skip(skip);

  // Order by creation date
  qb.orderBy('user.createdAt', 'DESC');

  const [users, total] = await qb.getManyAndCount();

  return {
    message:'users retrived successfully',
    status:'success',
    statusCode:200,
    data: users,
    pagination:pagination({page:Number(page), limit:Number(limit),total})
   
  };
}


  async getAllUsers(): Promise<User[]> {
    this.logger.log("getting all users data", UserService.name);
    const users = await this.userRepository.find();

    return users;
  } 
  async createSuperAdmin(body:CreateAdminDto): Promise<string> {
    //  let { password } = body;
    body.password = await argon2hash(body.password); 
    // console.log(body)
    const result = await this.userRepository.insert(body); 
    const user = await this.userRepository.findOne({ where: { id: result.identifiers[0].id } });
    await this.verificationRepo.insert({
      // user:user,
      user,
      is_deleted:false,
      is_email_verified:true,
      // user_id:user. 
       
    })
    const verification = this
    return "Admin Created Successfully"
  }
async updateProfile(userId: string, updateDto: UpdateUserProfileDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Apply updates
    Object.assign(user, updateDto);

    return this.userRepository.save(user);
  }
  async getUserById(id: string): Promise<User> {
    // console.log(id)
    const user = await this.userRepository.findOne( 
      { where: { id } ,
      // relations:['verfications'],
      // select: ["id", "firstName", "lastName", "email", "roles",'phone','address'] 
    });
  //  console.log(user)
    return user;
  }
  async getUser(id:string){
   return await this.userRepository.findOneByOrFail({ id })
  }
  async getUserByEmail(email:string){
   return await this.userRepository.findOne({where:{email}})
  }
  async getMultipleUserByIds(userIds:string[]){
 return await this.userRepository.findByIds(userIds);
  }

  async updateUserData(updateUserDto: UpdateUserDto, user: User) {
    let isUpdated: boolean = false;

    this.logger.log(`Checking if user exists`, UserService.name);
    const currentUser = await this.userRepository.findOne({ where: { id: user.id } });

    if (!currentUser) throw new NotFoundException("User Not Found");

    this.logger.log(`Attempting to update user data`, UserService.name);
    Object.keys(currentUser).forEach((key) => {
      if (updateUserDto[key] !== undefined && currentUser[key] !== updateUserDto[key]) {
        currentUser[key] = updateUserDto[key];
        isUpdated = true;
        this.logger.log(`Updated ${key} from ${currentUser[key]} to ${updateUserDto[key]}`, UserService.name);
      }
    });

    if (!isUpdated) {
      this.logger.log(`User didn't update any data`, UserService.name);
      return user;
    }

    this.logger.log(`Save Updated User`, UserService.name);
    await this.userRepository.save(currentUser);

    this.logger.log("Sending update Confirmation Mail", UserService.name);
    this.mailService.sendConfirmationOnUpdatingUser(user);

    return currentUser;
  }
  async updateImage({imageUrl, user}: {imageUrl: string, user: User}) {
    this.logger.log(`Updating user image`, UserService.name);
    const updatedUser = await this.userRepository.update(user.id, { image: imageUrl });
    
    if (!updatedUser) {
      throw new NotFoundException("User not found");
    }

    this.logger.log(`Image updated successfully`, UserService.name);
    return { message: "Image uploaded successfully", status: "success", data: null };
  }
  async updateUserUpdatedTimeAndOfflineStatus({user_id,user}: {user_id: string, user?: Partial<User>}) {
    this.logger.log(`Updating user Active Status`, UserService.name);
    const updatedUser = await this.userRepository.update(user_id, { isActive:false});
    
    if (!updatedUser) {
      throw new NotFoundException("User not found");
    }

    return updatedUser
  }
}
