const fs = require('fs')
const path = require('path')

// Read the coreExports.d.ts file
const coreExportsPath = path.join(
  __dirname,
  '../.temp/declarations/core/src/coreExports.d.ts',
)
const coreExportsContent = fs.readFileSync(coreExportsPath, 'utf8')

// Read the current index.d.ts
const indexPath = path.join(__dirname, '../core/dist/index.d.ts')
const indexContent = fs.readFileSync(indexPath, 'utf8')

// Extract the function declarations from coreExports
const functionDeclarations = coreExportsContent
  .split('\n')
  .filter(
    (line) =>
      line.includes('export declare function') ||
      line.includes('export { notify }') ||
      line.includes('export { types }') ||
      line.includes('export { createRafDriver }') ||
      line.includes('export type { IRafDriver }'),
  )
  .join('\n')

// Replace the export from './coreExports' with the actual declarations
const newIndexContent = indexContent.replace(
  /export \{ IRafDriver, createRafDriver, getProject, notify, onChange, types, val \} from '\.\/coreExports';/,
  `// Re-exported from coreExports
export { notify } from '@tomorrowevening/theatre-shared/notify';
export * as types from './propTypes/index';
export { createRafDriver } from './rafDrivers';
export type { IRafDriver } from './rafDrivers';

/**
 * Returns a project of the given id, or creates one if it doesn't already exist.
 */
export declare function getProject(id: string, config?: IProjectConfig): IProject;

/**
 * Calls \`callback\` every time the pointed value of \`pointer\` changes.
 */
export declare function onChange<P extends PointerType<any> | Prism<any>>(
  pointer: P, 
  callback: (value: P extends PointerType<infer T> ? T : P extends Prism<infer T> ? T : unknown) => void, 
  rafDriver?: IRafDriver
): VoidFn;

/**
 * Takes a Pointer and returns the value it points to.
 */
export declare function val<T>(pointer: PointerType<T>): T;

// Additional types needed
import type { PointerType, Prism } from '@tomorrowevening/theatre-dataverse';
import type { VoidFn } from '@tomorrowevening/theatre-shared/utils/types';`,
)

// Write the fixed content
fs.writeFileSync(indexPath, newIndexContent)
console.log('Fixed core type definitions')
