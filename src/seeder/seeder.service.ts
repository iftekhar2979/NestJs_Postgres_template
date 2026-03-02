// src/user/user.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateAdminDto } from "src/auth/dto/create-user.dto";
import { Category } from "src/category/entity/category.entity";
import { ProductColor } from "src/products/colors/entities/colors.entity";
import { SubCategory } from "src/products/sub_categories/entities/sub_categories.entity";
import { Setting } from "src/settings/entity/settings.entity";
import { Size } from "src/sizes/entity/sizes.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { UserService } from "src/user/user.service";
import { Repository } from "typeorm";

const SEED_DATA = {
  categories: [
    {
      name: "Apparel",
      description: "Main clothing line",
      subCategories: [
        { name: "T-Shirts", sizeType: "Alpha" }, // S, M, L
        { name: "Hoodies", sizeType: "Alpha" },
        { name: "Jeans", sizeType: "Waist" }, // 30, 32, 34
        { name: "Trousers", sizeType: "Waist" },
      ],
    },
    {
      name: "Footwear",
      description: "Shoes and sneakers",
      subCategories: [
        { name: "Sneakers", sizeType: "Numeric" }, // 8, 9, 10
        { name: "Boots", sizeType: "Numeric" },
      ],
    },
    {
      name: "Accessories",
      description: "Add-ons",
      subCategories: [
        { name: "Belts", sizeType: "Waist" },
        { name: "Hats", sizeType: "OneSize" },
      ],
    },
  ],
  colors: [
    { name: "Midnight Black", image: "#000000" },
    { name: "Pure White", image: "#FFFFFF" },
    { name: "Navy Blue", image: "#000080" },
    { name: "Charcoal Grey", image: "#36454F" },
    { name: "Forest Green", image: "#228B22" },
    { name: "Burgundy", image: "#800020" },
  ],
  sizes: [
    { type: "Alpha", name: "XS" },
    { type: "Alpha", name: "S" },
    { type: "Alpha", name: "M" },
    { type: "Alpha", name: "L" },
    { type: "Alpha", name: "XL" },
    { type: "Waist", name: "30" },
    { type: "Waist", name: "32" },
    { type: "Waist", name: "34" },
    { type: "Waist", name: "36" },
    { type: "Numeric", name: "8" },
    { type: "Numeric", name: "9" },
    { type: "Numeric", name: "10" },
    { type: "Numeric", name: "11" },
    { type: "OneSize", name: "OS" },
  ],
};
@Injectable()
export class SeederService {
  constructor(
    private readonly _userService: UserService,
    // private readonly settingService: SettingsService,
    @InjectRepository(Setting) private _settingModel: Repository<Setting>,
    @InjectRepository(Category) private _categoryRepository: Repository<Category>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectRepository(SubCategory) private subRepo: Repository<SubCategory>,
    @InjectRepository(Size) private sizeRepo: Repository<Size>,
    @InjectRepository(ProductColor) private colorRepo: Repository<ProductColor>
  ) {}

  async seedAdminUser() {
    const adminEmail = "admin@petAttix.com"; // Use a valid email
    const adminPassword = "1qaAzxsw2@";
    const existingAdmin = await this._userService.getUserByEmail("admin@petAttix.com");

    if (!existingAdmin) {
      const adminDto: CreateAdminDto = {
        firstName: "Mr.",
        lastName: "Admin",
        address: "Nothing",
        phone: "+8801837352979",
        currency: "GBM",
        email: adminEmail,
        password: adminPassword,
        roles: [UserRoles.ADMIN],
      };

      await this._userService.createSuperAdmin(adminDto); // Assuming create method is in your UserService
      console.log("Admin user created successfully!");
    } else {
      console.log("Admin user already exists.");
    }
  }
  async seedSettings() {
    // const repo = set.getRepository(Setting);

    const seedData = [
      {
        key: "privacy_policy",
        content: `
        **Privacy Policy**
        Effective Date: 12-28-2024
        Vibley ("we," "our," "us") is committed to protecting your privacy. ...
      `,
      },
      {
        key: "about_us",
        content: `
        **About Us**
        Welcome to Vibley!
        At Vibley, we are dedicated to providing a community-focused platform. ...
      `,
      },
      {
        key: "terms_and_condition",
        content: `
        **Terms and Conditions**
        Effective Date: 12-28-2024
        Welcome to Vibley! By using our services, you agree to comply with ...
      `,
      },
    ];

    for (const item of seedData) {
      const exists = await this._settingModel.findOne({ where: { key: item.key } });
      if (!exists) {
        await this._settingModel.insert(item);
        // await setting.save(setting);
      }
    }

    console.log("✅ Settings seeded.");
  }
  // async seedCategories() {
  //   // const repo = set.getRepository(Setting);

  //   const categories: Partial<Category>[] = [
  //     { name: "Dog Supplies", image: "categories/dog-supplies.jpg" },
  //     { name: "Cat Supplies", image: "categories/cat-supplies.jpg" },
  //     { name: "Fish & Aquarium", image: "categories/fish-aquarium.jpg" },
  //     { name: "Bird Supplies", image: "categories/bird-supplies.jpg" },
  //     { name: "Small Animal Supplies", image: "categories/small-animal.jpg" },
  //     // { name: 'Reptile & Amphibian', image: '/images/categories/reptile.jpg' },
  //     // { name: 'Pet Carriers & Crates', image: '/images/categories/carriers-crates.jpg' },
  //     { name: "Bedding & Furniture", image: "categories/bedding.jpg" },
  //     // { name: 'Feeding & Watering', image: '/images/categories/feeding.jpg' },
  //     // { name: 'Collars, Leashes & Tags', image: '/images/categories/collars-leashes.jpg' },
  //     // { name: 'Toys & Entertainment', image: '/images/categories/toys.jpg' },
  //     // { name: 'Grooming & Health', image: '/images/categories/grooming-health.jpg' },
  //     // { name: 'Training & Behavior', image: '/images/categories/training.jpg' },
  //     // { name: 'Clothing & Accessories', image: '/images/categories/clothing.jpg' },
  //     // { name: 'Cleaning & Waste', image: '/images/categories/cleaning-waste.jpg' },
  //     // { name: 'Cages & Habitats', image: '/images/categories/cages-habitats.jpg' },
  //     // { name: 'Travel & Outdoor Gear', image: '/images/categories/travel-outdoor.jpg' },
  //     // { name: 'Miscellaneous', image: '/images/categories/misc.jpg' },
  //   ];
  //   const category = await this._categoryRepository.find({ where: { name: "Dog Supplies" } });
  //   if (category) {
  //     console.log("Categories already exist");
  //   } else {
  //     await this._categoryRepository.insert(categories);
  //   }

  //   // for (const item of seedData) {
  //   //   const exists = await this._settingModel.findOne({ where: { key: item.key } });
  //   //   if (!exists) {
  //   //     await this._settingModel.insert(item);
  //   //     // await setting.save(setting);
  //   //   }
  //   // }

  //   console.log("✅ Settings seeded.");
  // }

  async runSeed() {
    // 1. Seed Colors
    const savedColors = await this.colorRepo.save(SEED_DATA.colors);

    // 2. Seed Sizes
    const savedSizes = await this.sizeRepo.save(SEED_DATA.sizes);

    // 3. Seed Categories & SubCategories
    for (const catData of SEED_DATA.categories) {
      const category = await this.catRepo.save({
        name: catData.name,
        description: catData.description,
      });

      for (const subData of catData.subCategories) {
        await this.subRepo.save({
          name: subData.name,
          categoryId: category.id,
          description: `All ${subData.name} in ${catData.name}`,
          // Note: If you add a 'sizeType' column to SubCategory,
          // you can use it later to filter which sizes show up in the UI.
        });
      }
    }

    return { message: "Database Seeded Successfully" };
  }
}
