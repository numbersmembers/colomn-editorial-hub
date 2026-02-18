import { registerGenerator } from './registry';
import { roadGenerator } from './road/index';
import { genericGenerator } from './generic/index';

// Register all generators (called once on server startup)
let initialized = false;

if (!initialized) {
  registerGenerator(roadGenerator);
  registerGenerator(genericGenerator);
  initialized = true;
}

export {};
