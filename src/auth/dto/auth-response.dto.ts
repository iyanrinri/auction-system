import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    createdAt: Date;
  };
}