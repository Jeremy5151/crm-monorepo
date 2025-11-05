import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
  IsIP,
  IsObject,
  IsISO31661Alpha2,
  Matches,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

const noDigits = /^[^\d]+$/;

export class CreateLeadDto {
  // Имя/фамилия: без цифр
  @ApiProperty({ required: false })
  @ValidateIf(o => o.firstName !== undefined)
  @Matches(noDigits, { message: 'firstName must not contain digits' })
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiProperty({ required: false })
  @ValidateIf(o => o.lastName !== undefined)
  @Matches(noDigits, { message: 'lastName must not contain digits' })
  @IsString()
  @Length(1, 100)
  lastName?: string;

  // Email обязателен
  @ApiProperty()
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  // Телефон обязателен: принимаем с + и без; нормализуем к виду с +
  @ApiProperty()
  @IsString()
  @Length(5, 50)
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const raw = value.trim();
    const cleaned = raw.replace(/[^\d+]/g, '');
    return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  })
  phone!: string;

  // IP (если не пришёл — возьмём в контроллере)
  @ApiProperty({ required: false })
  @IsOptional()
  @IsIP()
  ip?: string;

  // Страна ISO-2
  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO31661Alpha2()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  country?: string;

  // Аффилиат: обязателен и должен совпадать с X-API-Key
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  aff!: string;

  // Бокс (если нет — лид не отправляем, только сохраняем)
  @ApiProperty({ required: false, type: Number })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsInt()
  @Min(1)
  bx?: number;

  // Оффер/воронка
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  funnel?: string;

  // UTM (camelCase)
  @ApiProperty({ required: false }) @IsOptional() @IsString() utmSource?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() utmMedium?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() utmCampaign?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() utmTerm?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() utmContent?: string;

  // Прочее
  @ApiProperty({ required: false }) @IsOptional() @IsString() clickid?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() comment?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() lang?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() useragent?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() url?: string;

  // Доп. параметры ключ-значение
  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  attrs?: Record<string, string>;

  // sub1..sub20 (сольём в attrs)
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub1?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub2?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub3?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub4?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub5?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub6?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub7?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub8?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub9?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub10?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub11?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub12?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub13?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub14?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub15?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub16?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub17?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub18?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub19?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sub20?: string;

  // Groups (для назначения лида на группы)
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ each: true })
  groupIds?: string[];
}
