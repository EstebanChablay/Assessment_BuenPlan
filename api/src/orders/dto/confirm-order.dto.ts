import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  email: string;
}
