import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsString()
  timezone!: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  calculation_method?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  madhab?: number;

  @IsOptional()
  @IsIn(['12h', '24h'])
  time_format?: '12h' | '24h';
}
