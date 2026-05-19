const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {

    console.log("🔥 Limpando banco...");

    await prisma.comandaItem.deleteMany();
    await prisma.comanda.deleteMany();

    await prisma.jogoEvento.deleteMany();
    await prisma.jogoJogador.deleteMany();
    await prisma.jogoEstatisticaTime.deleteMany();
    await prisma.estatisticaJogo.deleteMany();

    await prisma.jogo.deleteMany();

    await prisma.timeGrupo.deleteMany();
    await prisma.grupo.deleteMany();

    await prisma.tabelaCampeonato.deleteMany();
    await prisma.timeCampeonato.deleteMany();
    await prisma.campeonato.deleteMany();

    await prisma.pagamento.deleteMany();
    await prisma.agendamento.deleteMany();

    await prisma.cardapio.deleteMany();
    await prisma.campo.deleteMany();

    await prisma.societyPlayer.deleteMany();

    await prisma.time.deleteMany();

    await prisma.notificacao.deleteMany();

    await prisma.usuario.deleteMany();

    await prisma.society.deleteMany();

    console.log("✅ Banco limpo");

    /*
    =========================================
    SOCIETY
    =========================================
    */

    const donoSociety = await prisma.usuario.create({
        data: {
            nome: "Lucas Society",
            email: "society@goplay.com",
            senha: "123456",
            tipo: "DONO_SOCIETY"
        }
    });

    const society = await prisma.society.create({
        data: {
            nome: "GoPlay Arena",
            cidade: "Jaguariúna",
            estado: "SP",
            usuarioId: donoSociety.id
        }
    });

    /*
    =========================================
    CAMPOS
    =========================================
    */

    const campo = await prisma.campo.create({
        data: {
            nome: "Campo Principal",
            societyId: society.id,
            valorAvulso: 250,
            valorMensal: 800
        }
    });

    /*
    =========================================
    CARDÁPIO
    =========================================
    */

    const produtos = [];

    for (let i = 1; i <= 10; i++) {

        const item = await prisma.cardapio.create({
            data: {
                nome: `Produto ${i}`,
                preco: Number((Math.random() * 20 + 5).toFixed(2)),
                societyId: society.id
            }
        });

        produtos.push(item);
    }

    /*
    =========================================
    TIMES
    =========================================
    */

    const times = [];

    for (let i = 1; i <= 8; i++) {

        const dono = await prisma.usuario.create({
            data: {
                nome: `Dono Time ${i}`,
                email: `dono${i}@goplay.com`,
                senha: "123456",
                tipo: "DONO_TIME"
            }
        });

        const time = await prisma.time.create({
            data: {
                nome: `Time ${i}`,
                societyId: society.id,
                donoId: dono.id,
                modalidade: "Society",
                cidade: "Jaguariúna",
                estado: "SP",
                tipoVinculo: "MENSALISTA",
                statusVinculo: "APROVADO",
                valorMensalidade: 500
            }
        });

        times.push(time);

        /*
        =========================================
        PLAYERS
        =========================================
        */

        for (let j = 1; j <= 15; j++) {

            const player = await prisma.usuario.create({
                data: {
                    nome: `Player ${i}-${j}`,
                    email: `player${i}_${j}@goplay.com`,
                    senha: "123456",
                    tipo: "PLAYER",
                    timeRelacionadoId: time.id
                }
            });

            await prisma.societyPlayer.create({
                data: {
                    societyId: society.id,
                    usuarioId: player.id
                }
            });

            /*
            =========================================
            COMANDAS
            =========================================
            */

            const comanda = await prisma.comanda.create({
                data: {
                    societyId: society.id,
                    usuarioId: player.id,
                    timeId: time.id,
                    status: Math.random() > 0.5
                        ? "PAGA"
                        : "ABERTA",
                    total: 0
                }
            });

            let total = 0;

            for (let k = 1; k <= 3; k++) {

                const produto =
                    produtos[
                    Math.floor(Math.random() * produtos.length)
                    ];

                const qtd =
                    Math.floor(Math.random() * 3) + 1;

                const subtotal =
                    produto.preco * qtd;

                total += subtotal;

                await prisma.comandaItem.create({
                    data: {
                        comandaId: comanda.id,
                        cardapioId: produto.id,
                        nomeProduto: produto.nome,
                        precoUnitario: produto.preco,
                        quantidade: qtd,
                        total: subtotal
                    }
                });
            }

            await prisma.comanda.update({
                where: {
                    id: comanda.id
                },
                data: {
                    total
                }
            });
        }

        /*
        =========================================
        AGENDAMENTOS
        =========================================
        */

        for (let a = 1; a <= 5; a++) {

            await prisma.agendamento.create({
                data: {
                    societyId: society.id,
                    campoId: campo.id,
                    timeId: time.id,
                    data: new Date(),
                    horaInicio: "20:00",
                    horaFim: "21:00",
                    valor: 250,
                    status: "CONFIRMADO"
                }
            });
        }
    }

    /*
    =========================================
    CAMPEONATO
    =========================================
    */

    const campeonato = await prisma.campeonato.create({
        data: {
            nome: "Copa Teste",
            societyId: society.id,
            tipo: "LIGA_IDA_VOLTA",
            maxTimes: 8,
            status: "EM_ANDAMENTO",
            modalidade: "SOCIETY",
            categoria: "ADULTO"
        }
    });

    for (const time of times) {

        await prisma.timeCampeonato.create({
            data: {
                campeonatoId: campeonato.id,
                timeId: time.id
            }
        });

        await prisma.tabelaCampeonato.create({
            data: {
                campeonatoId: campeonato.id,
                timeId: time.id,
                pontos: Math.floor(Math.random() * 15),
                vitorias: Math.floor(Math.random() * 5),
                empates: Math.floor(Math.random() * 3),
                derrotas: Math.floor(Math.random() * 5),
                golsPro: Math.floor(Math.random() * 20),
                golsContra: Math.floor(Math.random() * 20),
                saldoGols: Math.floor(Math.random() * 10)
            }
        });
    }

    console.log("✅ Seed finalizado");
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });