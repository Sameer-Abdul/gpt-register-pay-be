import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  async getStates(): Promise<string[]> {
    const locations = await this.locationRepository
      .createQueryBuilder('location')
      .select('DISTINCT location.state', 'state')
      .orderBy('location.state', 'ASC')
      .getRawMany();
    
    return locations.map(loc => loc.state).filter(Boolean);
  }

  async getDistricts(state: string): Promise<string[]> {
    if (!state) return [];
    
    const locations = await this.locationRepository
      .createQueryBuilder('location')
      .select('DISTINCT location.district', 'district')
      .where('location.state = :state', { state })
      .orderBy('location.district', 'ASC')
      .getRawMany();
    
    return locations.map(loc => loc.district).filter(Boolean);
  }

  async getMandals(district: string): Promise<string[]> {
    if (!district) return [];
    
    const locations = await this.locationRepository
      .createQueryBuilder('location')
      .select('DISTINCT location.mandal', 'mandal')
      .where('location.district = :district', { district })
      .orderBy('location.mandal', 'ASC')
      .getRawMany();
    
    return locations.map(loc => loc.mandal).filter(Boolean);
  }

  async getAllLocations(): Promise<Location[]> {
    return this.locationRepository.find({
      order: {
        state: 'ASC',
        district: 'ASC',
        mandal: 'ASC',
      },
    });
  }
}
