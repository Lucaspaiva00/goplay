const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
let timer;
function startStoryCleanupJob() {
  if (timer) return;
  let running = false;
  const clean = async () => {
    if (running) return;
    running = true;
    try {
      // Stories are temporary: removing the row also removes its image and views.
      await prisma.story.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      });
    } catch (error) {
      console.error(
        "[GOPLAY STORIES] falha ao remover stories expirados:",
        error.message,
      );
    } finally {
      running = false;
    }
  };
  clean();
  timer = setInterval(clean, 60 * 60 * 1000);
  timer.unref();
}
module.exports = { startStoryCleanupJob };
