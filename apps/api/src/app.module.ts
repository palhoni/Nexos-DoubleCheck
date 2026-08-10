import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HistoryModule } from './common/history/history.module';
import { AuthModule } from './auth/auth.module';
import { ProjetosModule } from './projetos/projetos.module';
import { TimesModule } from './times/times.module';
import { PessoasModule } from './pessoas/pessoas.module';
import { ProdutosModule } from './produtos/produtos.module';
import { PublicoAlvoModule } from './publico-alvo/publico-alvo.module';
import { ModulosModule } from './modulos/modulos.module';
import { FuncionalidadesModule } from './funcionalidades/funcionalidades.module';
import { JornadasModule } from './jornadas/jornadas.module';
import { RegrasModule } from './regras/regras.module';
import { IntegracoesModule } from './integracoes/integracoes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FontesModule } from './fontes/fontes.module';
import { DocumentosModule } from './documentos/documentos.module';
import { ConhecimentoModule } from './conhecimento/conhecimento.module';
import { GovernancaModule } from './governanca/governanca.module';
import { BuscaModule } from './busca/busca.module';
import { AtividadeModule } from './atividade/atividade.module';
import { MinhaAreaModule } from './minha-area/minha-area.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HistoryModule,
    AuthModule,
    ProjetosModule,
    TimesModule,
    PessoasModule,
    ProdutosModule,
    PublicoAlvoModule,
    ModulosModule,
    FuncionalidadesModule,
    JornadasModule,
    RegrasModule,
    IntegracoesModule,
    DashboardModule,
    FontesModule,
    DocumentosModule,
    ConhecimentoModule,
    GovernancaModule,
    BuscaModule,
    AtividadeModule,
    MinhaAreaModule,
    AgentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
