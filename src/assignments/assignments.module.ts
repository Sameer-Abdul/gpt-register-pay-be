import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { Assignment } from './entities/assignment.entity';
import { Register } from '../register/entities/register.entity';
import { ConfigModule } from '@nestjs/config';
import { LocalAssignmentStorageService } from './storage/local-assignment-storage.service';
import { AssignmentStorage } from './storage/assignment-storage.interface';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Assignment,
      Register
    ])
  ],
  controllers: [AssignmentsController],
  providers: [
    AssignmentsService,
    { provide: 'AssignmentStorage', useClass: LocalAssignmentStorageService },
  ],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
