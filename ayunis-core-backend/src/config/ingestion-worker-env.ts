import './env';
import { ingestionTopology } from 'src/common/process/ingestion-topology';

// Queue-module providers are selected while the module graph is imported.
ingestionTopology.declareWorker();
