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
  const containerRef = useRef<HTMLDivElement>(null!)
  const [projectReady, setProjectReady] = useState(false)

  // Check Sequence markers
  useEffect(() => {
    if (!projectReady) return

    const sheet = project.sheet('DOM')
    console.log(
      'Markers:',
      sheet.sequence.getMarkerPosition('start'),
      sheet.sequence.getMarkerPosition('mid'),
      sheet.sequence.getMarkerPosition('end'), // doesn't exist, should return undefined
    )
  }, [projectReady])

  // Sets Project Ready
  useEffect(() => {
    project.ready.then(() => {
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
          <Box3D project={project} name="Top Left" x={padding} y={padding} />
          <Box3D project={project} name="Top Right" x={right} y={padding} />
          <Box3D project={project} name="Bottom Left" x={padding} y={bottom} />
          <Box3D project={project} name="Bottom Right" x={right} y={bottom} />
        </div>
      )}
    </>
  )
}
