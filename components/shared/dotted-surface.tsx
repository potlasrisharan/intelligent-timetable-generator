"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"

export function DottedSurface({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const compactViewport = window.innerWidth < 960

    if (reducedMotion || compactViewport) {
      return
    }

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x050a14, 1800, 8200)

    const camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      1,
      10000,
    )
    camera.position.set(0, 320, 1180)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const separation = 150
    const amountX = 34
    const amountY = 46
    const geometry = new THREE.BufferGeometry()
    const positions: number[] = []
    const colors: number[] = []

    for (let x = 0; x < amountX; x++) {
      for (let y = 0; y < amountY; y++) {
        positions.push(
          x * separation - (amountX * separation) / 2,
          0,
          y * separation - (amountY * separation) / 2,
        )

        colors.push(0.72, 0.75, 0.8)
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 6.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.58,
      sizeAttenuation: true,
    })

    const dots = new THREE.Points(geometry, material)
    scene.add(dots)

    let frame = 0
    let animationFrame = 0

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    const animate = () => {
      const positionAttr = geometry.attributes.position
      const positionArray = positionAttr.array as Float32Array

      let index = 0
      for (let x = 0; x < amountX; x++) {
        for (let y = 0; y < amountY; y++) {
          positionArray[index + 1] =
            Math.sin((x + frame) * 0.26) * 28 +
            Math.sin((y + frame) * 0.44) * 24
          index += 3
        }
      }

      positionAttr.needsUpdate = true
      renderer.render(scene, camera)
      frame += 0.06
      animationFrame = window.requestAnimationFrame(animate)
    }

    window.addEventListener("resize", onResize)
    animate()

    return () => {
      window.removeEventListener("resize", onResize)
      window.cancelAnimationFrame(animationFrame)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-80",
        className,
      )}
    >
      <div className="grid-mask absolute inset-0 opacity-35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_25%),radial-gradient(circle_at_80%_20%,rgba(148,163,184,0.08),transparent_20%)]" />
    </div>
  )
}
