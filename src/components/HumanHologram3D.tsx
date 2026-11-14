import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HOLOGRAM_MODEL_URL } from '../hologramAsset'

type ViewerProps = { view: 'front' | 'back'; layer: string; scanning: boolean }
type LoadStatus = { state: 'loading'; progress: number | null } | { state: 'ready' } | { state: 'error'; message: string }
type LoadEntry = { promise: Promise<GLTF>; listeners: Set<(event: ProgressEvent) => void> }
type ModelResources = { geometries: Set<THREE.BufferGeometry>; materials: Set<THREE.Material>; textures: Set<THREE.Texture> }

// Share the parsed source GLB across mounts (including React StrictMode replays); each viewer gets
// its own disposable scene/material/texture instances while the original parsed asset stays cached.
const gltfLoads = new Map<string, LoadEntry>()
let referenceTexturePromise: Promise<THREE.Texture> | null = null
let posteriorTexturePromise: Promise<THREE.Texture> | null = null

function getReferenceTexture() {
  if (!referenceTexturePromise) {
    referenceTexturePromise = new THREE.TextureLoader().loadAsync('/ares-human-hologram-reference.webp').then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      return texture
    }).catch((error: unknown) => {
      referenceTexturePromise = null
      throw error
    })
  }
  return referenceTexturePromise
}

function getPosteriorTexture() {
  if (!posteriorTexturePromise) {
    posteriorTexturePromise = new THREE.TextureLoader().loadAsync('/ares-human-hologram-rear-reference.png').then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      return texture
    }).catch((error: unknown) => {
      posteriorTexturePromise = null
      throw error
    })
  }
  return posteriorTexturePromise
}

function getGLTF(url: string, onProgress: (event: ProgressEvent) => void): { promise: Promise<GLTF>; unsubscribe: () => void } {
  let entry = gltfLoads.get(url)
  if (!entry) {
    const listeners = new Set<(event: ProgressEvent) => void>()
    let resolveLoad!: (gltf: GLTF) => void
    let rejectLoad!: (reason: unknown) => void
    const promise = new Promise<GLTF>((resolve, reject) => { resolveLoad = resolve; rejectLoad = reject })
    entry = { promise, listeners }
    gltfLoads.set(url, entry)
    new GLTFLoader().load(
      url,
      (gltf) => resolveLoad(gltf),
      (event) => listeners.forEach((listener) => listener(event)),
      (error) => {
        if (gltfLoads.get(url) === entry) gltfLoads.delete(url)
        rejectLoad(error)
      },
    )
  }
  entry.listeners.add(onProgress)
  return { promise: entry.promise, unsubscribe: () => entry?.listeners.delete(onProgress) }
}

function disposeResources(resources: ModelResources | null) {
  if (!resources) return
  resources.geometries.forEach((geometry) => geometry.dispose())
  resources.materials.forEach((material) => material.dispose())
  resources.textures.forEach((texture) => texture.dispose())
  resources.geometries.clear()
  resources.materials.clear()
  resources.textures.clear()
}

function makeViewerScene(source: THREE.Group, referenceTexture: THREE.Texture, posteriorTexture: THREE.Texture): { model: THREE.Group; resources: ModelResources } {
  const model = source.clone(true)
  const resources: ModelResources = { geometries: new Set(), materials: new Set(), textures: new Set() }
  const textureClones = new Map<THREE.Texture, THREE.Texture>()
  const cloneTexture = (texture: THREE.Texture | null | undefined) => {
    if (!texture) return null
    let clone = textureClones.get(texture)
    if (!clone) {
      clone = texture.clone()
      clone.needsUpdate = true
      textureClones.set(texture, clone)
      resources.textures.add(clone)
    }
    return clone
  }
  const referenceMap = cloneTexture(referenceTexture)
  const posteriorMap = cloneTexture(posteriorTexture)
  const makeUnlitMaterial = (sourceMaterial: THREE.Material, bounds: THREE.Box3) => {
    const pbr = sourceMaterial as THREE.MeshStandardMaterial
    const baseColor = pbr.map ? new THREE.Color(0xffffff) : (pbr.color?.clone() ?? new THREE.Color(0xffffff))
    const material = new THREE.MeshBasicMaterial({
      color: baseColor,
      map: cloneTexture(pbr.map),
      alphaMap: cloneTexture(pbr.alphaMap),
      aoMap: cloneTexture(pbr.aoMap),
      aoMapIntensity: pbr.aoMapIntensity,
      lightMap: cloneTexture(pbr.lightMap),
      lightMapIntensity: pbr.lightMapIntensity,
      envMap: cloneTexture(pbr.envMap),
      alphaTest: pbr.alphaTest,
      opacity: pbr.opacity,
      transparent: pbr.transparent,
      side: pbr.side,
      vertexColors: pbr.vertexColors,
      depthWrite: pbr.depthWrite,
      depthTest: pbr.depthTest,
      blending: pbr.blending,
      premultipliedAlpha: pbr.premultipliedAlpha,
      wireframe: false,
      toneMapped: false,
    })
    // The generated mesh faces +X. Project the authoritative source and matching posterior art
    // onto opposite surfaces of this same mesh; this is not a pair of view-dependent billboards.
    const size = bounds.getSize(new THREE.Vector3())
    material.onBeforeCompile = (shader) => {
      shader.uniforms.referenceMap = { value: referenceMap }
      shader.uniforms.posteriorMap = { value: posteriorMap }
      shader.uniforms.referenceBounds = { value: new THREE.Vector4(bounds.min.z, size.z, bounds.min.y, size.y) }
      shader.uniforms.referenceImageBounds = { value: new THREE.Vector4(190 / 1365, 88 / 2048, 968 / 1365, 1929 / 2048) }
      shader.uniforms.posteriorImageBounds = { value: new THREE.Vector4(213 / 1536, 38 / 2304, 1099 / 1536, 2152 / 2304) }
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
uniform vec4 referenceBounds;
uniform vec4 referenceImageBounds;
uniform vec4 posteriorImageBounds;
varying vec2 vReferenceUv;
varying vec2 vPosteriorUv;
varying float vReferenceFacing;`)
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
vReferenceUv = vec2(1.0 - (position.z - referenceBounds.x) / referenceBounds.y, (position.y - referenceBounds.z) / referenceBounds.w);
vReferenceUv = referenceImageBounds.xy + vReferenceUv * referenceImageBounds.zw;
vPosteriorUv = vec2((position.z - referenceBounds.x) / referenceBounds.y, (position.y - referenceBounds.z) / referenceBounds.w);
vPosteriorUv = posteriorImageBounds.xy + vPosteriorUv * posteriorImageBounds.zw;
vReferenceFacing = normal.x;`)
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D referenceMap;
uniform sampler2D posteriorMap;
varying vec2 vReferenceUv;
varying vec2 vPosteriorUv;
varying float vReferenceFacing;`)
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
vec4 referenceColor = texture2D(referenceMap, vReferenceUv);
vec4 posteriorColor = texture2D(posteriorMap, vPosteriorUv);
float frontBlend = smoothstep(0.05, 0.4, vReferenceFacing);
float posteriorBlend = smoothstep(0.05, 0.4, -vReferenceFacing) * posteriorColor.a;
diffuseColor.rgb = mix(diffuseColor.rgb * 2.0, referenceColor.rgb, frontBlend);
diffuseColor.rgb = mix(diffuseColor.rgb, posteriorColor.rgb, posteriorBlend);`)
    }
    material.customProgramCacheKey = () => 'ares-reference-projection-v1'
    material.userData.hologramBaseOpacity = pbr.opacity
    material.userData.hologramBaseTransparent = pbr.transparent
    resources.materials.add(material)
    return material
  }

  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    node.geometry = node.geometry.clone()
    node.geometry.computeBoundingBox()
    resources.geometries.add(node.geometry)
    const originalMaterials = Array.isArray(node.material) ? node.material : [node.material]
    const bounds = node.geometry.boundingBox!
    const materials = originalMaterials.map((material) => makeUnlitMaterial(material, bounds))
    node.material = Array.isArray(node.material) ? materials : materials[0]
    node.castShadow = false
    node.receiveShadow = false
  })
  return { model, resources }
}

function applyDisplayPreset(root: THREE.Object3D, layer: string) {
  // The selector is a visual preset only; it does not identify separate anatomy meshes.
  const opacityByLayer: Record<string, number> = { 'Full Body': 1, Skeletal: 0.9, Organs: 0.95, 'Surface / Wounds': 0.97 }
  const opacityFactor = opacityByLayer[layer] ?? 1
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    const materials = Array.isArray(node.material) ? node.material : [node.material]
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshBasicMaterial)) return
      const baseOpacity = Number(material.userData.hologramBaseOpacity ?? 1)
      material.opacity = baseOpacity * opacityFactor
      material.transparent = Boolean(material.userData.hologramBaseTransparent) || material.opacity < 1
      material.needsUpdate = true
    })
  })
}

export default function HumanHologram3D({ view, layer, scanning }: ViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const viewerGroupRef = useRef<THREE.Group | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const resourcesRef = useRef<ModelResources | null>(null)
  const modelSizeRef = useRef<THREE.Vector3 | null>(null)
  const viewRef = useRef(view)
  const layerRef = useRef(layer)
  const scanningRef = useRef(scanning)
  const loadTokenRef = useRef(0)
  const [rendererReady, setRendererReady] = useState(false)
  const [retry, setRetry] = useState(0)
  const [status, setStatus] = useState<LoadStatus>({ state: 'loading', progress: null })

  useEffect(() => {
    viewRef.current = view
    if (viewerGroupRef.current) viewerGroupRef.current.rotation.y = view === 'back' ? Math.PI : 0
  }, [view])

  useEffect(() => {
    layerRef.current = layer
    if (modelRef.current) applyDisplayPreset(modelRef.current, layer)
  }, [layer])

  useEffect(() => {
    scanningRef.current = scanning
    if (viewerGroupRef.current) viewerGroupRef.current.scale.setScalar(scanning ? 1.006 : 1)
  }, [scanning])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let renderer: THREE.WebGLRenderer
    try {
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100)
      camera.position.set(0, 0, 5)
      const viewerGroup = new THREE.Group()
      viewerGroup.rotation.y = viewRef.current === 'back' ? Math.PI : 0
      viewerGroup.scale.setScalar(scanningRef.current ? 1.006 : 1)
      scene.add(viewerGroup)
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.NoToneMapping
      mount.appendChild(renderer.domElement)
      rendererRef.current = renderer
      cameraRef.current = camera
      viewerGroupRef.current = viewerGroup

      const fitCamera = () => {
        const width = Math.max(1, mount.clientWidth)
        const height = Math.max(1, mount.clientHeight)
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        const size = modelSizeRef.current
        if (size) {
          const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov / 2)
          const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect)
          const margin = 1.16
          const distance = Math.max(
            size.y / (2 * Math.tan(verticalHalfFov)) * margin,
            size.x / (2 * Math.tan(horizontalHalfFov)) * margin,
            size.z * 1.5,
          )
          camera.position.set(0, 0, Math.max(distance, 0.5))
          camera.near = Math.max(0.01, distance / 150)
          camera.far = Math.max(100, distance * 8)
          camera.updateProjectionMatrix()
        }
      }
      fitCamera()
      const observer = new ResizeObserver(fitCamera)
      observer.observe(mount)
      let frame = 0
      const animate = () => {
        frame = requestAnimationFrame(animate)
        if (viewerGroupRef.current === viewerGroup) {
          viewerGroup.position.y = Math.sin(Date.now() * 0.0012) * 0.012
          viewerGroup.rotation.y = viewRef.current === 'back' ? Math.PI : 0
          viewerGroup.scale.setScalar(scanningRef.current ? 1.006 : 1)
        }
        renderer.render(scene, camera)
      }
      animate()
      setRendererReady(true)

      return () => {
        setRendererReady(false)
        loadTokenRef.current += 1
        cancelAnimationFrame(frame)
        observer.disconnect()
        const currentModel = modelRef.current
        if (currentModel) viewerGroup.remove(currentModel)
        disposeResources(resourcesRef.current)
        modelRef.current = null
        resourcesRef.current = null
        modelSizeRef.current = null
        rendererRef.current = null
        cameraRef.current = null
        viewerGroupRef.current = null
        renderer.dispose()
        renderer.domElement.remove()
        scene.clear()
      }
    } catch (error) {
      rendererRef.current = null
      setRendererReady(false)
      setStatus({ state: 'error', message: error instanceof Error ? error.message : 'WebGL renderer initialization failed.' })
    }
  }, [])

  useEffect(() => {
    if (!rendererReady || !rendererRef.current) return
    const token = ++loadTokenRef.current
    let active = true
    const progress = (event: ProgressEvent) => {
      if (!active || token !== loadTokenRef.current) return
      const loaded = Number(event.loaded) || 0
      const total = Number(event.total) || 0
      setStatus({ state: 'loading', progress: total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : null })
    }
    setStatus({ state: 'loading', progress: null })
    const currentModel = modelRef.current
    if (currentModel && viewerGroupRef.current) viewerGroupRef.current.remove(currentModel)
    disposeResources(resourcesRef.current)
    modelRef.current = null
    resourcesRef.current = null
    modelSizeRef.current = null

    const request = getGLTF(HOLOGRAM_MODEL_URL, progress)
    Promise.all([request.promise, getReferenceTexture(), getPosteriorTexture()]).then(([gltf, referenceTexture, posteriorTexture]) => {
      if (!active || token !== loadTokenRef.current || !rendererRef.current || !viewerGroupRef.current) return
      const { model, resources } = makeViewerScene(gltf.scene, referenceTexture, posteriorTexture)
      // The image-to-3D export faces +X; the scanner camera looks down -Z.
      model.rotation.y -= Math.PI / 2
      model.updateMatrixWorld(true)
      const originalBox = new THREE.Box3().setFromObject(model)
      const originalSize = originalBox.getSize(new THREE.Vector3())
      const center = originalBox.getCenter(new THREE.Vector3())
      if (!Number.isFinite(originalSize.y) || originalSize.y <= 0) throw new Error('The 3D model has no usable height.')
      const scale = 2.7 / originalSize.y
      model.scale.setScalar(scale)
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
      model.updateMatrixWorld(true)
      const fittedSize = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
      modelSizeRef.current = fittedSize
      applyDisplayPreset(model, layerRef.current)
      modelRef.current = model
      resourcesRef.current = resources
      viewerGroupRef.current.add(model)
      const mount = mountRef.current
      const camera = cameraRef.current
      if (mount && camera) {
        camera.aspect = Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight)
        const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov / 2)
        const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect)
        const margin = 1.16
        const distance = Math.max(
          fittedSize.y / (2 * Math.tan(verticalHalfFov)) * margin,
          fittedSize.x / (2 * Math.tan(horizontalHalfFov)) * margin,
          fittedSize.z * 1.5,
        )
        camera.position.set(0, 0, Math.max(distance, 0.5))
        camera.near = Math.max(0.01, distance / 150)
        camera.far = Math.max(100, distance * 8)
        camera.updateProjectionMatrix()
      }
      setStatus({ state: 'ready' })
    }).catch((error: unknown) => {
      if (!active || token !== loadTokenRef.current) return
      setStatus({ state: 'error', message: error instanceof Error ? error.message : 'The 3D model could not be loaded.' })
    })

    return () => {
      active = false
      loadTokenRef.current += 1
      request.unsubscribe()
    }
  }, [rendererReady, retry])

  const retryLoad = useCallback(() => {
    setStatus({ state: 'loading', progress: null })
    setRetry((value) => value + 1)
  }, [])

  return (
    <div className="hologram-viewer" aria-label="Reference-preserving 3D human hologram">
      <div ref={mountRef} className="hologram-3d-canvas" aria-hidden="true" />
      {status.state === 'loading' && (
        <div className="hologram-model-status" role="status" aria-live="polite">
          <span>LOADING 3D MODEL</span>
          <div className="hologram-load-track" aria-hidden="true"><i className={status.progress === null ? 'indeterminate' : ''} style={status.progress === null ? undefined : { width: `${status.progress}%` }} /></div>
          <small>{status.progress === null ? 'Preparing reference model' : `${status.progress}%`}</small>
        </div>
      )}
      {status.state === 'error' && (
        <div className="hologram-model-status error" role="alert">
          <strong>3D MODEL UNAVAILABLE</strong>
          <small>{status.message}</small>
          <button type="button" onClick={retryLoad}>RETRY MODEL LOAD</button>
        </div>
      )}
    </div>
  )
}
