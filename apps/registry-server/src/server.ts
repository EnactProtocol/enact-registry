import app from './app';
import figlet from "figlet";
import logger from './logger';

export const port = process.env.PORT || 8081;
const bannerWord1 = figlet.textSync('Enact', {
  font: 'Standard',
  horizontalLayout: 'default',
  verticalLayout: 'default',
});
const bannerWord2 = figlet.textSync('Protocol', {
  font: 'Standard',
  horizontalLayout: 'default',
  verticalLayout: 'default',
});
app.listen(port, () => {
  console.log(bannerWord1);
  console.log(bannerWord2);
  console.log(`🦊 Server is running at http://localhost:${port}`);
  logger.info('hello')
  
});
