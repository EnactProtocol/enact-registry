import app from './app'
import logger from './logger'

app.listen(8080)

logger.info('Server running on http://localhost:8080')
