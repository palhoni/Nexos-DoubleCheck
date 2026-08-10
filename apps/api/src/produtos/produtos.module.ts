import { Module } from '@nestjs/common';
import { ProdutosController } from './produtos.controller';
import { ProdutosGlobalController } from './produtos-global.controller';
import { ProdutosService } from './produtos.service';

@Module({
  controllers: [ProdutosController, ProdutosGlobalController],
  providers: [ProdutosService],
})
export class ProdutosModule {}
