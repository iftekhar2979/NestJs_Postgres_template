// src/user/user.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateAdminDto } from "src/auth/dto/create-user.dto";
import { Setting } from "src/settings/entity/settings.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { UserService } from "src/user/user.service";
import { Repository } from "typeorm";

@Injectable()
export class SeederService {
  constructor(
    private readonly _userService: UserService,
    // private readonly settingService: SettingsService,
    @InjectRepository(Setting) private _settingModel: Repository<Setting>
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
}
