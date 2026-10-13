import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateStoryCommentDto {
  @IsString()
  @IsNotEmpty({ message: "Komentar tidak boleh kosong" })
  @MaxLength(500, { message: "Komentar maksimal 500 karakter" })
  content: string;
}
