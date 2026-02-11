import React, {useEffect, useRef, useState} from 'react'
import type {CSSProperties} from 'react'
import type {IProject} from '@tomorrowevening/theatre-core'
import {Box3D, BoxSize} from './Box3D'

// Scene

const SceneCSS: CSSProperties = {
  overflow: 'hidden',
  position: 'absolute',
  left: '0',
  right: '0',
  top: '0',
  bottom: '0',
}

export const Scene: React.FC<{project: IProject}> = ({project}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const simpelRef = useRef<HTMLDivElement>(null)
  const [projectReady, setProjectReady] = useState(false)

  // Check Sequence markers
  useEffect(() => {
    if (!projectReady) return
    const simple = simpelRef.current
    if (!simple) return

    const domSheet = project.sheet('DOM')
    console.log(
      'Markers:',
      domSheet.sequence.getMarkerPosition('start'),
      domSheet.sequence.getMarkerPosition('mid'),
      domSheet.sequence.getMarkerPosition('end'), // doesn't exist, should return undefined
    )

    function onEvent(evt: any) {
      console.log(evt.name, evt.value)
    }
    domSheet.sequence.listen('test', onEvent)

    // Subsequence

    const simpleSheet = project.sheet('Simple')
    const sheetObj = simpleSheet.object('Example', {
      opacity: 1,
    })
    const unsubscribe = sheetObj.onValuesChange((values: any) => {
      simple.style.opacity = values.opacity
    })

    // Add simpleSheet as a sub-sequence to domSheet at position 2 seconds
    // domSheet.sequence.addSubSequence('Simple', 0.25, {
    //   label: 'Simple Test',
    // })
    // console.log(subSeqId)

    // console.log('Added sub-sequence with ID:', subSeqId)

    // You can also update it later
    // domSheet.sequence.updateSubSequence(subSeqId, {
    //   position: 3,
    //   duration: 5,
    // })

    // Or remove it
    // domSheet.sequence.removeSubSequence(subSeqId)

    return () => {
      unsubscribe()
    }
  }, [projectReady])

  // Sets Project Ready
  useEffect(() => {
    void project.ready.then(() => {
      setProjectReady(true)
    })
  }, [])

  const padding = 100
  const right = window.innerWidth - padding - BoxSize
  const bottom = window.innerHeight - padding - BoxSize

  return (
    <>
      {projectReady && (
        <div ref={containerRef} style={SceneCSS}>
          <div
            ref={simpelRef}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '200px',
              background: 'rgba(17, 180, 131, 1)',
            }}
          >
            Hello
          </div>
          <Box3D project={project} name="Top Left" x={padding} y={padding} />
          <Box3D project={project} name="Top Right" x={right} y={padding} />
          <Box3D project={project} name="Bottom Left" x={padding} y={bottom} />
          <Box3D project={project} name="Bottom Right" x={right} y={bottom} />
        </div>
      )}
    </>
  )
}
