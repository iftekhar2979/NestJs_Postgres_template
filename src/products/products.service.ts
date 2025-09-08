import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, ILike, In, LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { FavouriteProduct, Product } from './entities/products.entity';
import { ProductImage } from './entities/productImage.entity';
import { CreateProductDto } from './dto/CreateProductDto.dto';
import { ProductStatus } from './enums/status.enum';
import { GetProductsQueryDto } from './dto/GetProductDto.dto';
import { pagination } from 'src/shared/utils/pagination';
import { UpdateProductDto } from './dto/updatingProduct.dto';
import { ResponseInterface } from 'src/common/types/responseInterface';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationAction, NotificationRelated, NotificationType } from 'src/notifications/entities/notifications.entity';
import { UserRoles } from 'src/user/enums/role.enum';
import { User } from 'src/user/entities/user.entity';
import { use } from 'passport';
import { Transections } from 'src/transections/entity/transections.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WalletsService } from 'src/wallets/wallets.service';
import { Wallets } from 'src/wallets/entity/wallets.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserBehaviourService } from 'src/user-behaviour/user-behaviour.service';
import { TransectionType } from 'src/transections/enums/transectionTypes';
import { PaymentStatus } from 'src/orders/enums/orderStatus';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

     private readonly dataSource: DataSource, 
    @InjectQueue("product") private readonly queue:Queue ,
    //  @InjectQueue("behaviour") private readonly userBehaviour:Queue ,
    private readonly userBehaviourService:UserBehaviourService,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    @InjectRepository(Wallets)
    private readonly walletsRepo: Repository<Wallets>,
    private readonly notificationService: NotificationsService,

@InjectRepository(Transections) private readonly transectionRepository: Repository<Transections>,
  ) {}
// async getProductById({product_id,status,}){

// }
 checkProductStatus(status:ProductStatus){
if(status === ProductStatus.SOLD) {
      throw new BadRequestException('Product is already sold');
    }
    if(status === ProductStatus.DELETED) {
      throw new BadRequestException('Product is already Deleted');
    }
}

  async updateProductStatus(
    {id,user_id, status}:{id:number;user_id?:string;status:ProductStatus}
  ): Promise<Product> {
    const query =user_id ? {id,user_id} :{ id };
    const product = await this.productRepository.findOne({ where: { ...query} });   
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found.`);
    }
    this.checkProductStatus(product.status)
    
    return this.productRepository.save({
      ...product,
      status,
    });
  }
  async create(createProductDto: CreateProductDto, user: User) {

    const wallets = await this.walletsRepo.findOne({where:{user_id:user.id}})
    if(!wallets){
      await this.walletsRepo.insert({user:user, user_id:user.id , currency:"BDT" , version:0 , balance:0})
       throw new BadRequestException("You Wallet is not active . It's activing soon !")
    }
    if(createProductDto.is_boosted){
      if(wallets.balance === 0 || wallets.balance <= 10){
        throw new ForbiddenException("You should have minimum 10 balance in your wallet to boost a product")
        
      }
    }
     const sellingPrice = parseFloat(createProductDto.selling_price);
  const purchasingPrice = parseFloat(createProductDto.phurcasing_price); // keep original spelling if necessary
  const quantity = parseInt(createProductDto.quantity, 10);

  // const postalCode = parseFloat(createProductDto.postal_code)
  const isNegotiable = createProductDto.is_negotiable.toLowerCase() === 'true';
  const isBoosted = createProductDto.is_boosted.toLowerCase() === 'true';
  // const id_address_residential = createProductDto.is_address_residential.toLocaleLowerCase() === 'true';
const boostDays = 3
const productBoostingCost = 1
  // Validate that numeric values are valid
  if (isNaN(sellingPrice) || isNaN(purchasingPrice) || isNaN(quantity) ) {
    throw new BadRequestException('Invalid numeric values for price, quantity, or dimensions');
  }

    // Start a transaction to ensure product and images are saved together
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // Create product instance
      const product = new Product();
      product.user_id = user.id;  // Set userId
      product.product_name = createProductDto.product_name;
      product.selling_price = sellingPrice;
      product.purchasing_price = purchasingPrice;
      product.category = createProductDto.category;
      product.quantity = quantity;
      product.description = createProductDto.description;
      product.condition = createProductDto.condition;
      product.size = createProductDto.size;
      product.brand = createProductDto.brand;
      product.is_negotiable = isNegotiable;
      product.status = ProductStatus.PENDING; // Default status
      product.is_boosted = isBoosted;
      product.boost_start_time = new Date()
      product.boost_end_time = isBoosted ? new Date(Date.now() + boostDays * 24 * 60 * 60 * 1000) : null; // 7 days boost

      if(createProductDto.is_boosted){
        wallets.balance -= productBoostingCost
        wallets.version += 1
        const transection = new Transections()
        transection.amount = productBoostingCost
        transection.paymentMethod ='Internal'
        transection.product = product
        transection.user = user
        transection.user_id = user.id
        transection.status = PaymentStatus.COMPLETED
        transection.transection_type = TransectionType.BOOST
        transection.paymentId = `TSN-${product.id}-${Math.floor(Math.random() * 1000000)}`
        transection.product_id = product.id
        transection.wallet = wallets
        transection.wallet_id = wallets.id
        
        await queryRunner.manager.save(Wallets, wallets)
       await queryRunner.manager.save(Transections, transection)
      
  }
      const savedProduct = await queryRunner.manager.save(Product, product);

      // Handle images if any
      if (createProductDto.images && Array.isArray(createProductDto.images)) {
 
         await this.queue.add("Product-image",createProductDto.images,{
          attempts:10,
         })
        const productImages = createProductDto.images.map((imgUrl: string) => {
          const img = new ProductImage();
          img.image = imgUrl;
          img.product_id = savedProduct.id;  // Associate image with the product
          return img;
        });
        
        // Save product images inside the transaction
        await queryRunner.manager.save(ProductImage, productImages);
      }
      // Commit the transaction after saving both product and images
      await queryRunner.commitTransaction();
 // Create notification (can also be part of the transaction)
      await this.notificationService.createNotification({
        userId: user.id,
        related: NotificationRelated.PRODUCT,
        msg: `${user.firstName} has listed a product for your review!`,
        type: NotificationType.SUCCESS,
        targetId: savedProduct.id,
        notificationFor: UserRoles.ADMIN,
        action: NotificationAction.CREATED,
        isImportant: true,
      });
      const productWithImages = await this.productRepository.findOne({
        where: { id: savedProduct.id },
        // relations: ['images']
      });
      const productImage = await this.productImageRepository.find({
        where: { product_id: savedProduct.id },
      });
      productWithImages.images = productImage; // Attach images to the product
      return {
        message: 'Product created successfully',
        data: productWithImages,
        statusCode: 201,
      };
    } catch (error) {
      // Rollback the transaction in case of any error
      await queryRunner.rollbackTransaction();
      console.error('Error in creating product and images:', error);
      throw new BadRequestException('Error occurred while creating the product');
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }
  async findAll(
  page = 1,
  limit = 10,
  filters?: { name?: string; category?: string; size?: string ,userId ?:string , type:'own' | 'global' },
): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
  const skip = (page - 1) * limit;

  const query = this.productRepository.createQueryBuilder('product')
    .leftJoinAndSelect('product.images', 'images');

    if(filters.type =='own'){
query.andWhere('product.user_id = :user_id',{user_id:filters.userId})
    }
  // Filters
  if (filters?.name) {
    query.andWhere('product.product_name ILIKE :name', { name: `%${filters.name}%` });
  }

  if (filters?.category) {
    query.andWhere('product.category ILIKE :category', { category: `%${filters.category}%` });
  }

  if (filters?.size) {
    query.andWhere('product.size = :size', { size: filters.size });
  }

  // Pagination
  query.skip(skip).take(limit);

  const [data, total] = await query.getManyAndCount();

  return {
    data,
    total,
    page,
    limit,
  };
}
 shuffleArray(array) {
  let currentIndex = array.length, randomIndex, temporaryValue;

  // While there remain elements to shuffle
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // Swap elements
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}
   async findAllWithFilters(query: GetProductsQueryDto) {
  const {
    term,
    size,
    category,
    price,
    page = '1',
    limit = '10',
    userId,
    user,
    type
  } = query;

  // console.log(term)
  const where: any = {};

  // Text Search
  if (term) {
    where.product_name = ILike(`%${term}%`);
  }

  if (category) {
    where.category = ILike(`%${category}%`);
  }

  if (size) {
    const sizes = size.split(',');
    where.size = In(sizes);
  }

  if (price) {
    const [min, max] = price.split('-').map(Number);
    where.selling_price = Between(min || 0, max || Number.MAX_SAFE_INTEGER);
  }

  if (type === 'own') {
    where.user_id = userId;
  }

  where.status = ProductStatus.AVAILABLE;

if(!term || !category ){

  const behaviorData = await this.userBehaviourService.latestBehaviour(userId);
  if(behaviorData && behaviorData.search){ 
    where.product_name = ILike(`%${behaviorData.search}%`)
  }
  if(behaviorData && behaviorData.category){ 
    where.category = ILike(`%${behaviorData.category}%`)
  }
  
      // Adjust filters based on user behavior
      // if (behaviorData.searchTerms.length > 0) {
      //   where.product_name = ILike(`%${behaviorData.searchTerms.join(' ')}%`);  // Combine search terms

      // }
}
    // if (behaviorData.categories.length > 0) {
    //   where.category = In(behaviorData.categories);  // Match any of the aggregated categories
    // }

    // if (behaviorData.brand.length > 0) {
    //   where.size = In(behaviorData.brand);  // Match any of the aggregated sizes
    // }

    // if (behaviorData.priceRanges.length > 0) {
    //   const [minPrice, maxPrice] = behaviorData.priceRanges[0].split('-').map(Number);  // Just use the first available range
    //   where.selling_price = Between(minPrice || 0, maxPrice || Number.MAX_SAFE_INTEGER);
    // }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  if(term || category || price ){
    await this.queue.add('user-behaviour',{ user,search:term,category,price,size},{attempts:10})

  }
  const [data, total] = await this.productRepository.findAndCount({
    where,
    skip,
    take,
    order: {is_boosted:"DESC",boost_end_time: "ASC",created_at: 'DESC' },
    // relations: ['images'],  // Ensure images are loaded
  });


  
const productIds = data.map(product => product.id);
  const productImages = await this.productImageRepository.find({
    where: { product_id: In(productIds) },
  });  
  data.forEach(product => {  
    product.images = productImages.filter(image => image.product_id === product.id);
  });

  const boostedProducts = data.filter(product => product.is_boosted);
    // console.log(boostedProducts)
  const nonBoostedProducts = data.filter(product => !product.is_boosted);
  // Shuffle only the boosted products
  const shuffledBoostedProducts = this.shuffleArray(boostedProducts);
  const finalData = [...shuffledBoostedProducts, ...nonBoostedProducts];
  return {
    message: "Products retrieved successfully",
    statusCode: 200,
    data:finalData,
    pagination: pagination({ page: parseInt(page), limit: parseInt(limit), total }),
  };
}
async boostProduct({ productId, user }: { productId: number; user: User }) {
  const product = await this.getProduct(productId); // Assume this fetches the product
  const wallets = await this.walletsRepo.findOne({ where: { user_id: user.id } });

  if (!wallets) {
    throw new BadRequestException("Wallet not found for this user");
  }

  if (product.is_boosted) {
    throw new BadRequestException("Product already boosted!");
  }

  const productBoostingCost = 1;
  const boostDays = 3;
  const daysInSecond = 24 * 60 * 60 * 1000;

  if (wallets.balance < productBoostingCost) {
    throw new BadRequestException("You don't have enough balance to boost the product!");
  }

  if (product.user.id !== user.id) {
    throw new ForbiddenException("This is not your product");
  }

  // Start a new transaction
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // Update wallet balance
    wallets.balance -= productBoostingCost;
    wallets.version += 1;

    // Update product details
    product.is_boosted = true;
    product.boost_start_time = new Date();
    product.boost_end_time = new Date(Date.now() + boostDays * daysInSecond);

    // Create a new transaction record
    const transection = new Transections();
    transection.amount = productBoostingCost;
    transection.paymentMethod = 'Internal';
    transection.product = product;
    transection.user = product.user;
    transection.wallet = wallets;
    transection.wallet_id = wallets.id;
    transection.status = PaymentStatus.COMPLETED;
    transection.transection_type = TransectionType.BOOST;
    transection.paymentId = `TSN-${productId}-${Math.floor(Math.random() * 1000000)}`;
    transection.product_id = product.id;

    // Save the transaction, wallet, and product within the transaction context
    await queryRunner.manager.save(Transections, transection);
    await queryRunner.manager.save(Wallets, wallets);
    const savedProduct = await queryRunner.manager.save(Product, product);

    // Commit the transaction after all operations
    await queryRunner.commitTransaction();

    return { message: "Product boosted successfully", data: savedProduct, status: 'success', statusCode: 200 };
  } catch (error) {
    // Rollback the transaction if any error occurs
    await queryRunner.rollbackTransaction();
    console.error('Error during boosting product transaction:', error);
    throw new InternalServerErrorException('An error occurred while boosting the product.');
  } finally {
    // Always release the queryRunner, whether the transaction was successful or not
    await queryRunner.release();
  }
}

@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Runs every minute for demonstration ; adjust as needed .
  async expireBoostedProducts() {
    const currentDate = new Date();

    const expiredBoostedProducts = await this.productRepository.find({
      where: {
        is_boosted: true,
        boost_end_time: LessThanOrEqual(currentDate), // Expired boosts
      },
    });
    // console.log()
console.log("Cron Job : ",expiredBoostedProducts)
    for (const product of expiredBoostedProducts) {
      product.is_boosted = false;
      product.boost_start_time = null;    
      product.boost_end_time = null;
      await this.productRepository.save(product);
    }
  }

   async updateProduct(id: number, updateDto: UpdateProductDto , user_id:string): Promise<{message:string,statusCode:number,data:Product}> {
    const product = await this.productRepository.findOne({ where: { id,user_id ,status:ProductStatus.AVAILABLE } });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found.`);
    }

    try {
    
           Object.assign(product, {
        ...updateDto,
        selling_price: Number(updateDto.selling_price),
        purchasing_price: Number(updateDto.phurcasing_price),
        quantity: Number(updateDto.quantity),
        is_negotiable: updateDto.is_negotiable === 'true',
        images: updateDto.images.length > 0 ? updateDto.images : product.images
      });
      // Optional: Replace images if new images are provided
      if(updateDto.images && Array.isArray(updateDto.images) && updateDto.images.length > 0) {
 await this.productImageRepository.delete({ product_id: id });

        // Add new images
       product.images = updateDto.images.map((imgUrl: string) => {
        const img = new ProductImage();
        img.image = imgUrl; // assuming images are URLs; if files, handle accordingly
        img.product_id = product.id; // link image to product
        return img;
      });
        await this.productImageRepository.insert(product.images);
      }
await this.productRepository.save(product);
      return {message:"Product updated successfully", statusCode:200, data: product};
    } catch (error) {
      console.error('Error updating product:', error);
      throw new BadRequestException('Failed to update product.');
    }
  }

  async getProduct(id:number):Promise<Product>{
    return await this.productRepository.findOne({
      where: { id },
      relations: [ 'user','favorites','images'], 
    });
  }

    async updateProductsStatus(id: number, status:ProductStatus ): Promise<ResponseInterface<Product>> {
      
    const product = await this.productRepository.findOne({ where: { id ,status:ProductStatus.PENDING } });
    if(!product){
      throw new NotFoundException("Product not found!")
    }
    await this.productRepository.save(product)
    return {message:"Product updated",statusCode:200,data: product,status:"success"}
    }
   async getProductifFavourites(id: number, userId ?: string): Promise<any> {
  
const product = await this.getProduct(id)
    // If the product doesn't exist, throw an exception
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if(product.status === ProductStatus.REJECTED){
      throw new BadRequestException('Product is Rejected');
    }
    if(product.status === ProductStatus.PENDING){
      throw new BadRequestException('Product is pending');
    }
    if(product.status === ProductStatus.DELETED){
      throw new BadRequestException('Product is deleted');
    }
    if(product.status === ProductStatus.SOLD){
      throw new BadRequestException('Product is sold');
    }
    // Check if the product has been favorited by the user
    const isFavorite = product.favorites.some(
      (favorite) => favorite.user.id === userId
    );
    const productImage = await this.productImageRepository.find({where:{id:product.id}})
    product.images = productImage
delete product.favorites

    // Return product with favorite status (true or false) and associated images
    return {
      message: 'Product retrieved successfully',
      statusCode: 200,
      data: {
        ...product,  // Spread product properties
        isFavorite,  // Set the favorite status based on user’s favorite
      },
    };
  
}
async checkProductIsAvailable(product:Product){
  if(product.status === ProductStatus.REJECTED){
      throw new BadRequestException('Product is Rejected');
    }
    if(product.status === ProductStatus.PENDING){
      throw new BadRequestException('Product is pending');
    }
    if(product.status === ProductStatus.DELETED){
      throw new BadRequestException('Product is deleted');
    }
    if(product.status === ProductStatus.SOLD){
      throw new BadRequestException('Product is sold');
    }
    return product
}
  async getProductIdAndDelete(product_id: number, userId?: string) {
    const product = await this.productRepository.findOne({ where: { id: product_id, user_id: userId } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Option 1: Soft delete (recommended if you have a status field)
    product.status = ProductStatus.DELETED;
    await this.productRepository.save(product);

    // Option 2: Hard delete (uncomment if you want to remove from DB)
    // await this.productRepository.delete({ id: product_id, user_id: userId });

    return {
      message: 'Product deleted successfully',
      statusCode: 200,
      data: {},
    };
  }
  
   async getProductById(id: number): Promise<ResponseInterface<Product>> {
    const product = await this.getProduct(id)
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return {message:"Product Retrived Successfully",data:product,statusCode:200,status:"success"};
  }

  async findByIdWithSeller(productId: number): Promise<Product> {
    return await this.productRepository.findOne({
      where: { id: productId },
      relations: ['user'],
    });
}
}
