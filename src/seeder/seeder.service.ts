// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateAdminDto, CreateUserDto } from 'src/auth/dto/create-user.dto';
import { Setting } from 'src/settings/entity/settings.entity';
import { UserRoles } from 'src/user/enums/role.enum';
import { UserService } from 'src/user/user.service';
import { DataSource, Repository } from 'typeorm';

// import {IUser} from '../../users/users.interface'; // Your user interface
// import { CreateUserDto } from './dto/create-user.dto'; // DTO for creating a user

@Injectable()
export class SeederService {
  constructor(
    private readonly userService: UserService,
    // private readonly settingService: SettingsService,
    @InjectRepository(Setting) private settingModel: Repository<Setting>,
  ) {}

  async seedAdminUser() {
    const adminEmail = 'admin@petAttix.com'; // Use a valid email
    const adminPassword =  '1qaAzxsw2@'
    const existingAdmin = await this.userService.getUserByEmail("admin@petAttix.com")

    let date = new Date();
    if (!existingAdmin) {
        const adminDto: CreateAdminDto = {
            firstName:'Mr.',
            lastName :"Admin", 
            address: 'Nothing' ,
            phone : '+8801837352979',
          email: adminEmail,
          password: adminPassword, 
          roles:[ UserRoles.ADMIN], 
           
        };

      await this.userService.createSuperAdmin(adminDto); // Assuming create method is in your UserService
      console.log('Admin user created successfully!');
    } else {
      console.log('Admin user already exists.');
    }
  }
 async seedSettings () {
  // const repo = set.getRepository(Setting);

  const seedData = [
    {
      key: 'privacy_policy',
      content: `
        **Privacy Policy**
        Effective Date: 12-28-2024
        Vibley ("we," "our," "us") is committed to protecting your privacy. ...
      `,
    },
    {
      key: 'about_us',
      content: `
        **About Us**
        Welcome to Vibley!
        At Vibley, we are dedicated to providing a community-focused platform. ...
      `,
    },
    {
      key: 'terms_and_condition',
      content: `
        **Terms and Conditions**
        Effective Date: 12-28-2024
        Welcome to Vibley! By using our services, you agree to comply with ...
      `,
    },
  ];

  for (const item of seedData) {
    const exists = await this.settingModel.findOne({ where: { key: item.key } });
    if (!exists) {
      const setting = await this.settingModel.insert(item);
      // await setting.save(setting);
    }
  }

  console.log('✅ Settings seeded.');
};
}
