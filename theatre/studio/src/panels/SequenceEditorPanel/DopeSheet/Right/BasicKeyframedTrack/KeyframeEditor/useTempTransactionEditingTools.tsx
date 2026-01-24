import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import type {SerializableValue} from '@tomorrowevening/theatre-shared/utils/types'
import type {
  CommitOrDiscard,
  ITransactionPrivateApi,
} from '@tomorrowevening/theatre-studio/StudioStore/StudioStore'
import type {IEditingTools} from '@tomorrowevening/theatre-studio/propEditors/utils/IEditingTools'
import {useMemo} from 'react'
import type SheetObject from '@tomorrowevening/theatre-core/sheetObjects/SheetObject'
import type {Asset} from '@tomorrowevening/theatre-shared/utils/assets'

/**
 * This function takes a function `writeTx` that sets a value in the private Studio API and
 * returns a memoized editingTools object which contains three functions:
 * - `temporarilySetValue` - uses `writeTx` to set a value that can be discarded
 * - `discardTemporaryValue` - if `temporarilySetValue` was called, discards the value it set
 * - `permanentlySetValue` - uses `writeTx` to set a value
 *
 * @param writeTx - a function that uses a value to perform an action using the
 * private Studio API.
 * @returns an editingTools object that can be passed to `DeterminePropEditorForKeyframe` or
 * `DetailDeterminePropEditor` and is used by the prop editors in `simplePropEditorByPropType`.
 */
export function useTempTransactionEditingTools<T extends SerializableValue>(
  writeTx: (api: ITransactionPrivateApi, value: T) => void,
  obj: SheetObject,
): IEditingTools<T> {
  return useMemo(() => createTempTransactionEditingTools<T>(writeTx, obj), [])
}

function createTempTransactionEditingTools<T>(
  writeTx: (api: ITransactionPrivateApi, value: T) => void,
  obj: SheetObject,
) {
  let currentTransaction: CommitOrDiscard | null = null
  const createTempTx = (value: T) =>
    getStudio().tempTransaction((api) => writeTx(api, value))

  function discardTemporaryValue() {
    currentTransaction?.discard()
    currentTransaction = null
  }

  const editAssets = {
    createAsset: obj.sheet.project.assetStorage.createAsset,
    getAssetUrl: (asset: Asset) =>
      asset.id
        ? obj.sheet.project.assetStorage.getAssetUrl(asset.id)
        : undefined,
  }

  return {
    temporarilySetValue(value: T): void {
      discardTemporaryValue()
      currentTransaction = createTempTx(value)
    },
    discardTemporaryValue,
    permanentlySetValue(value: T): void {
      discardTemporaryValue()
      createTempTx(value).commit()
    },
    ...editAssets,
  }
}
