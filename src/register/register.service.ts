// src/register/register.service.ts
import { Injectable,NotFoundException  } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Register } from './entities/register.entity';
import { CreateRegisterDto } from './dto/create-register.dto';

@Injectable()
export class RegisterService {
  constructor(
    @InjectRepository(Register)
    private readonly registerRepository: Repository<Register>,
  ) {}

  // src/register/register.service.ts
async create(createRegisterDto: CreateRegisterDto): Promise<Register> {
  const register = new Register();
  Object.assign(register, createRegisterDto);
  
  // Convert marriageDate string to Date object if it exists
  if (createRegisterDto.marriageDate) {
    register.marriageDate = new Date(createRegisterDto.marriageDate);
  }

  return this.registerRepository.save(register);
}

  async findOne(id: number): Promise<Register> {
    const register = await this.registerRepository.findOne({
      where: { id },
      relations: ['payment'],
    });
    
    if (!register) {
      throw new NotFoundException(`Register with ID ${id} not found`);
    }
    
    return register;
  }

  // For location data (states, districts, mandals)
  // In a real app, these would come from a separate location service or database
  async getStates(): Promise<string[]> {
    // This is a placeholder. In a real app, fetch from a location table
    return ['Andhra Pradesh', 'Telangana', 'Karnataka'];
  }

  async getDistricts(state: string): Promise<string[]> {
    // This is a placeholder. In a real app, fetch from a location table
    const districts = {
      'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
      'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagitial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal–Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
      'Karnataka': ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir']
    };
    return districts[state] || [];
  }

  async getMandals(district: string): Promise<string[]> {
    // This is a placeholder. In a real app, fetch from a location table
    // For demo, returning a few sample mandals
    return [`${district} Mandal 1`, `${district} Mandal 2`, `${district} Mandal 3`];
  }
}
