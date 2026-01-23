import type {PropTypeConfig} from '@tomorrowevening/theatre-core/propTypes'

export type PropConfigForType<K extends PropTypeConfig['type']> = Extract<
  PropTypeConfig,
  {type: K}
>
