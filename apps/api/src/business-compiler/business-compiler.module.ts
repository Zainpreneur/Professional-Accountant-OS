import { Module } from "@nestjs/common";
import { BusinessCompilerController } from "./business-compiler.controller";
import { BusinessCompilerService } from "./business-compiler.service";

@Module({
  controllers: [BusinessCompilerController],
  providers: [BusinessCompilerService],
  exports: [BusinessCompilerService],
})
export class BusinessCompilerModule {}
