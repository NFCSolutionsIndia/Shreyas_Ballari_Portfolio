"""
build_avatar.py - procedural, rigged avatars for the portfolio world (Blender 5.2, bpy only).

Builds two GLBs:
  * public/assets/shreyas/avatar.glb  - Shreyas, suit, face projected from portrait.png
  * public/assets/people/person.glb   - generic townsperson (materials Skin/Hair/Top/Bottom/Shoes)
and preview renders in tools/blender/renders/.

Run (from anywhere):
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" -b --factory-startup ^
      --python apps/web/tools/blender/build_avatar.py -- [--only avatar|person] [--no-render] [--debug-dir DIR]

Pipeline (each stage is its own function so the rig can be swapped later, e.g. for Mixamo's skeleton):
  build_*_meshes()  -> plain meshes in rest/T-pose, no weights (body proxy + visible meshes)
  build_armature()  -> Mixamo-named armature
  skin_meshes()     -> automatic (heat) weights on the full body proxy, transferred to every
                       visible mesh (body, clothes) so clothes follow the body exactly; hair is rigid on Head
  export_glb()      -> GLB (+Y up, model faces +Z), textures embedded as JPEG

Blender axes: Z up, the character faces -Y, character's left is +X.
"""
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree

# =============================================================================================
# CONSTANTS - paths
# =============================================================================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
PORTRAIT_PATH = os.path.join(WEB_ROOT, "public", "assets", "shreyas", "portrait.png")
AVATAR_GLB = os.path.join(WEB_ROOT, "public", "assets", "shreyas", "avatar.glb")
PERSON_GLB = os.path.join(WEB_ROOT, "public", "assets", "people", "person.glb")
RENDER_DIR = os.path.join(SCRIPT_DIR, "renders")
BLEND_DIR = os.path.join(SCRIPT_DIR, "blend")          # .blend snapshots (for re-skinning later)

# =============================================================================================
# CONSTANTS - photo -> head mapping (portrait.png pixel space, origin top-left)
# =============================================================================================
PHOTO_CX = 376.0          # x of the face mid-line in the photo
PHOTO_EYE_Y = 185.0       # y of the eye line in the photo
PHOTO_PX_PER_M = 1180.0   # photo pixels per metre at the face
FACE_TEX_SIZE = 1024      # face texture resolution (covers 400x400 photo px)
FACE_TEX_PHOTO_BOX = (PHOTO_CX - 200, 0, PHOTO_CX + 200, 400)   # x0, y0, x1, y1 in photo px
CHEEK_SAMPLES = [(318, 238), (436, 238), (330, 252), (424, 252), (350, 285), (402, 285)]
# face mask (photo px): ellipse centre and radii, feather width
FACE_MASK = dict(cx=PHOTO_CX, cy=222, rx=86, ry_top=112, ry_bot=94, feather=22)

# =============================================================================================
# CONSTANTS - proportions (metres, Blender coordinates)
# =============================================================================================
HEIGHT = 1.75             # crown of the skull (hair adds ~2 cm)
Z_EYE = 1.620
Z_CROWN = 1.738
ARM_Z = 1.405             # T-pose arm axis height
SHOULDER_X = 0.175
ELBOW_X = 0.465
WRIST_X = 0.71
HIP_X = 0.088
KNEE_Z = 0.49
KNEE_X = 0.088
ANKLE_X = 0.093
ANKLE_Z = 0.09

# skin-modifier skeleton: name -> (position, radius along world axes (rx, ry, rz), parent)
# radii: only the two axes perpendicular to the segment are used.
def body_nodes():
    N = {}
    def n(name, co, r, parent):
        N[name] = (Vector(co), r, parent)
    n("pelvis",    (0, 0.005, 0.90), (0.135, 0.095, 0), None)
    n("hips",      (0, 0.000, 0.97), (0.140, 0.095, 0), "pelvis")
    n("waist",     (0, 0.000, 1.07), (0.124, 0.085, 0), "hips")
    n("chest_lo",  (0, 0.000, 1.18), (0.134, 0.092, 0), "waist")
    n("chest",     (0, 0.000, 1.29), (0.145, 0.100, 0), "chest_lo")
    n("chest_hi",  (0, 0.005, 1.365), (0.145, 0.090, 0), "chest")
    n("neck_base", (0, 0.010, 1.455), (0.060, 0.055, 0), "chest_hi")
    n("neck_top",  (0, 0.012, 1.520), (0.052, 0.050, 0), "neck_base")
    for s, side in ((1, "L"), (-1, "R")):
        n("clav"+side,     (s*0.090, 0.002, 1.425), (0, 0.055, 0.050), "chest_hi")
        n("shoulder"+side, (s*SHOULDER_X, 0.0, ARM_Z), (0, 0.052, 0.054), "clav"+side)
        n("uparm"+side,    (s*0.32, 0.0, ARM_Z), (0, 0.044, 0.044), "shoulder"+side)
        n("elbow"+side,    (s*ELBOW_X, 0.0, ARM_Z), (0, 0.036, 0.035), "uparm"+side)
        n("forearm"+side,  (s*0.56, 0.0, ARM_Z), (0, 0.038, 0.034), "elbow"+side)
        n("wrist"+side,    (s*WRIST_X, 0.0, ARM_Z), (0, 0.029, 0.021), "forearm"+side)
        n("palm"+side,     (s*0.77, 0.0, ARM_Z - 0.002), (0, 0.043, 0.019), "wrist"+side)
        n("knuck"+side,    (s*0.815, 0.0, ARM_Z - 0.004), (0, 0.043, 0.016), "palm"+side)
        n("tip"+side,      (s*0.885, 0.0, ARM_Z - 0.006), (0, 0.036, 0.011), "knuck"+side)
        n("thumb1"+side,   (s*0.765, -0.040, ARM_Z - 0.006), (0.012, 0, 0.011), "palm"+side)
        n("thumb2"+side,   (s*0.795, -0.064, ARM_Z - 0.008), (0.009, 0, 0.008), "thumb1"+side)
        n("hipj"+side,     (s*HIP_X, 0.005, 0.86), (0.084, 0.084, 0), "pelvis")
        n("thigh"+side,    (s*0.086, 0.000, 0.68), (0.072, 0.073, 0), "hipj"+side)
        n("knee"+side,     (s*KNEE_X, 0.000, KNEE_Z), (0.049, 0.051, 0), "thigh"+side)
        n("calf"+side,     (s*0.090, 0.012, 0.36), (0.052, 0.055, 0), "knee"+side)
        n("ankle"+side,    (s*ANKLE_X, 0.012, ANKLE_Z), (0.032, 0.034, 0), "calf"+side)
        n("heel"+side,     (s*ANKLE_X, 0.022, 0.040), (0.032, 0, 0.030), "ankle"+side)
        n("ball"+side,     (s*(ANKLE_X + 0.004), -0.095, 0.030), (0.044, 0, 0.021), "heel"+side)
        n("toe"+side,      (s*(ANKLE_X + 0.007), -0.160, 0.026), (0.034, 0, 0.016), "ball"+side)
    return N

# Mixamo joint positions (head of each bone) and hierarchy: name -> (head, tail, parent)
def mixamo_joints():
    J = {}
    def b(name, head, tail, parent):
        J["mixamorig:" + name] = (Vector(head), Vector(tail), ("mixamorig:" + parent) if parent else None)
    b("Hips",        (0, 0.005, 0.95), (0, 0.003, 1.05), None)
    b("Spine",       (0, 0.003, 1.05), (0, 0.002, 1.17), "Hips")
    b("Spine1",      (0, 0.002, 1.17), (0, 0.004, 1.30), "Spine")
    b("Spine2",      (0, 0.004, 1.30), (0, 0.010, 1.455), "Spine1")
    b("Neck",        (0, 0.010, 1.455), (0, 0.012, 1.530), "Spine2")
    b("Head",        (0, 0.012, 1.530), (0, 0.010, Z_CROWN), "Neck")
    b("HeadTop_End", (0, 0.010, Z_CROWN), (0, 0.010, Z_CROWN + 0.06), "Head")
    for s, side in ((1, "Left"), (-1, "Right")):
        b(side+"Shoulder", (s*0.040, 0.004, 1.395), (s*SHOULDER_X, 0.0, ARM_Z), "Spine2")
        b(side+"Arm",      (s*SHOULDER_X, 0.0, ARM_Z), (s*ELBOW_X, 0.004, ARM_Z), side+"Shoulder")
        b(side+"ForeArm",  (s*ELBOW_X, 0.004, ARM_Z), (s*WRIST_X, 0.0, ARM_Z), side+"Arm")
        b(side+"Hand",     (s*WRIST_X, 0.0, ARM_Z), (s*0.80, 0.0, ARM_Z - 0.004), side+"ForeArm")
        b(side+"UpLeg",    (s*HIP_X, 0.005, 0.875), (s*KNEE_X, -0.004, KNEE_Z), "Hips")
        b(side+"Leg",      (s*KNEE_X, -0.004, KNEE_Z), (s*ANKLE_X, 0.012, ANKLE_Z), side+"UpLeg")
        b(side+"Foot",     (s*ANKLE_X, 0.012, ANKLE_Z), (s*(ANKLE_X + 0.004), -0.095, 0.025), side+"Leg")
        b(side+"ToeBase",  (s*(ANKLE_X + 0.004), -0.095, 0.025), (s*(ANKLE_X + 0.007), -0.170, 0.025), side+"Foot")
    return J

# =============================================================================================
# CONSTANTS - colours (sRGB hex) and materials
# =============================================================================================
SKIN_FALLBACK = "#b47a5c"     # used only if the photo sample fails
HAIR_COLOR = "#0e0a08"
HAIR_SHEEN = "#5a3a24"
JACKET_COLOR = "#16181f"
SHIRT_COLOR = "#a8bfe4"
TIE_BLUE = "#1d46c8"
TIE_YELLOW = "#ecd35c"
TIE_WHITE = "#f4f1e6"
TROUSER_COLOR = "#17181d"
SHOE_COLOR = "#0a0a0b"
BUTTON_COLOR = "#0c0c0e"
# townsperson defaults (the web code re-tints these)
PERSON_SKIN = "#a8775a"
PERSON_HAIR = "#2a1c14"
PERSON_TOP = "#c25a3c"
PERSON_BOTTOM = "#3a4a68"
PERSON_SHOES = "#3a2b20"

# =============================================================================================
# CONSTANTS - head shape (tables over z; see build_head)
# =============================================================================================
HEAD_Z_BOTTOM = 1.415
HEAD_Z_DOME = 1.665
HEAD_ZS =      [1.415, 1.47,  1.49,  1.500, 1.510, 1.525, 1.540, 1.555, 1.570, 1.585, 1.600, 1.620, 1.645, 1.665]
HEAD_W =       [0.066, 0.057, 0.057, 0.060, 0.062, 0.064, 0.067, 0.072, 0.077, 0.079, 0.079, 0.0785, 0.076, 0.076]
HEAD_TAPER =   [1.00,  1.00,  0.80,  0.55,  0.50,  0.58,  0.72,  0.84,  0.92,  0.96,  0.97,  0.97,  0.94,  0.93]
HEAD_FRONT =   [0.056, 0.048, 0.052, 0.077, 0.086, 0.088, 0.089, 0.090, 0.091, 0.092, 0.091, 0.089, 0.093, 0.090]
HEAD_BACK =    [0.058, 0.051, 0.052, 0.054, 0.056, 0.062, 0.072, 0.082, 0.092, 0.099, 0.103, 0.106, 0.106, 0.105]
HEAD_AXIS_Y =  [0.015, 0.015, 0.014, 0.012, 0.010, 0.006, 0.003, 0.000, 0.000, 0.000, 0.000, 0.000, 0.002, 0.004]
HEAD_ROUND =   [1.00,  1.00,  0.95,  0.90,  0.88,  0.86,  0.85,  0.85,  0.85,  0.85,  0.85,  0.86,  0.88,  0.90]
HEAD_RINGS_FACE = 46
HEAD_RINGS_DOME = 16
HEAD_SEGMENTS = 72
EAR = dict(x=0.076, y=0.012, z=1.587, rx=0.0062, ry=0.019, rz=0.029)

# hairline (z) as a function of angle around the head (deg, 0 = front, 180 = back)
HAIRLINE = [(0, 1.668), (25, 1.664), (45, 1.650), (62, 1.628), (80, 1.614), (95, 1.624),
            (112, 1.605), (135, 1.575), (160, 1.553), (180, 1.548)]

# =============================================================================================
# helpers
# =============================================================================================
def hex_srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def srgb_to_lin(c):
    return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c)

def smoothstep(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)

def gauss(d, s):
    return math.exp(-(d / s) ** 2)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob

def obj_from_bm(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))

def shade_smooth(ob):
    me = ob.data
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))

def apply_modifiers(ob):
    for m in list(ob.modifiers):
        with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob],
                                       selected_editable_objects=[ob]):
            bpy.ops.object.modifier_apply(modifier=m.name)

def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)

def make_material(name, color_hex=None, rough=0.6, metal=0.0, sheen=0.0, sheen_tint=None,
                  image=None, spec=0.5, color_lin=None, coat=0.0):
    mat = bpy.data.materials.new(name)
    try:
        mat.use_nodes = True
    except Exception:
        pass
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    col = color_lin if color_lin else srgb_to_lin(hex_srgb(color_hex)) if color_hex else (1, 1, 1)
    bsdf.inputs["Base Color"].default_value = (*col, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Specular IOR Level"].default_value = spec
    if sheen > 0:
        bsdf.inputs["Sheen Weight"].default_value = sheen
        bsdf.inputs["Sheen Roughness"].default_value = 0.6
        if sheen_tint:
            bsdf.inputs["Sheen Tint"].default_value = (*srgb_to_lin(hex_srgb(sheen_tint)), 1)
    if coat > 0:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.35
    mat.diffuse_color = (*col, 1)
    if image is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.location = (-400, 200)
        if color_hex or color_lin:  # tint factor: multiply texture by colour (exports as baseColorFactor)
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs["Factor"].default_value = 1.0
            nt.links.new(tex.outputs["Color"], mix.inputs["A"])
            mix.inputs["B"].default_value = (*col, 1)
            nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
        else:
            nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat

def np_to_image(name, arr):
    """arr: HxWx3/4 float sRGB, row 0 = top."""
    h, w = arr.shape[:2]
    if arr.shape[2] == 3:
        arr = np.concatenate([arr, np.ones((h, w, 1), np.float32)], axis=2)
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels.foreach_set(np.ascontiguousarray(arr[::-1], dtype=np.float32).ravel())
    img.update()
    try:
        img.pack()
    except Exception:
        pass
    return img

def save_debug_image(img, path):
    if not path:
        return
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()

# =============================================================================================
# photo / textures
# =============================================================================================
def load_photo():
    img = bpy.data.images.load(PORTRAIT_PATH)
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    a = a.reshape(h, w, 4)[::-1].copy()   # row 0 = top, sRGB values
    bpy.data.images.remove(img)
    return a

def sample_skin(photo):
    pts = []
    for (x, y) in CHEEK_SAMPLES:
        p = photo[y-5:y+5, x-5:x+5].reshape(-1, 4)
        pts.append(p[p[:, 3] > 0.9, :3])
    pts = np.concatenate(pts)
    return tuple(float(v) for v in np.median(pts, axis=0))

def bilinear(img, px, py):
    h, w = img.shape[:2]
    px = np.clip(px, 0, w - 1.001); py = np.clip(py, 0, h - 1.001)
    x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int)
    fx = (px - x0)[..., None]; fy = (py - y0)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def face_canvas_coords():
    x0, y0, x1, y1 = FACE_TEX_PHOTO_BOX
    n = FACE_TEX_SIZE
    j = (np.arange(n) + 0.5) / n
    px = x0 + j * (x1 - x0)
    py = y0 + j * (y1 - y0)
    return np.meshgrid(px, py)   # PX, PY (row 0 = top)

def world_to_photo(x, z):
    return PHOTO_CX + x * PHOTO_PX_PER_M, PHOTO_EYE_Y - (z - Z_EYE) * PHOTO_PX_PER_M

def photo_to_uv(px, py):
    x0, y0, x1, y1 = FACE_TEX_PHOTO_BOX
    return (px - x0) / (x1 - x0), 1.0 - (py - y0) / (y1 - y0)

# fixed UV spots in the face canvas (photo px) used for back/side/body faces
UV_SKIN_SPOT = (PHOTO_CX - 190, 390)   # bottom-left corner of canvas: plain skin
UV_SCALP_SPOT = (PHOTO_CX - 190, 10)   # top-left corner: dark scalp
UV_EAR_SPOT = (PHOTO_CX + 190, 390)    # bottom-right corner: slightly darker skin for the ears

def paint_ear_spot(canvas, PX, PY, factor=0.86):
    m = (np.abs(PX - UV_EAR_SPOT[0]) < 8) & (np.abs(PY - UV_EAR_SPOT[1]) < 8)
    canvas[m] = canvas[m] * factor

def paint_scalp(canvas, PX, PY, color, strength=1.0):
    # front hairline in photo space: dark above it (under the hair mesh) so gaps never show skin
    dx = np.abs(PX - PHOTO_CX)
    line = 128 + 0.0025 * dx ** 2           # hairline curving down at the temples
    line = np.minimum(line, 200)
    m = np.clip((line - PY) / 10.0, 0, 1)[..., None] * strength
    canvas[:] = canvas * (1 - m) + np.array(color)[None, None, :] * m

def build_face_texture_photo(photo, skin, debug_dir=None):
    PX, PY = face_canvas_coords()
    canvas = np.empty(PX.shape + (3,), np.float32)
    canvas[:] = skin
    hair = hex_srgb(HAIR_COLOR)
    paint_scalp(canvas, PX, PY, hair)
    src = bilinear(photo, PX, PY)
    fm = FACE_MASK
    ry = np.where(PY < fm["cy"], fm["ry_top"], fm["ry_bot"])
    d = np.sqrt(((PX - fm["cx"]) / fm["rx"]) ** 2 + ((PY - fm["cy"]) / ry) ** 2)
    # distance in px beyond ellipse (approx) -> feather
    edge = (d - 1.0) * np.minimum(fm["rx"], ry)
    mask = np.clip(1.0 - (edge + fm["feather"]) / fm["feather"], 0, 1)
    mask = mask * mask * (3 - 2 * mask)
    mask = mask * np.clip(src[..., 3], 0, 1)
    rgb = src[..., :3]
    # base skin = average photo colour in the feather ring (cheeks/jaw, no hair) -> seamless blend
    luma = rgb @ np.array([0.3, 0.59, 0.11], np.float32)
    ring = (mask > 0.05) & (mask < 0.7) & (src[..., 3] > 0.9) & (luma > 0.35) & (PY > 175)
    if ring.sum() > 200:
        skin = tuple(float(v) for v in np.median(rgb[ring], axis=0))
        canvas[:] = skin
        paint_scalp(canvas, PX, PY, hair)
    print("face ring skin colour (sRGB):", skin, "pixels", int(ring.sum()))
    m3 = mask[..., None]
    canvas = canvas * (1 - m3) + rgb * m3
    # fixed spots
    canvas = np.clip(canvas, 0, 1)
    paint_ear_spot(canvas, PX, PY)
    img = np_to_image("FaceTex", canvas)
    if debug_dir:
        save_debug_image(img, os.path.join(debug_dir, "face_tex.png"))
    return img

def build_face_texture_plain(debug_dir=None):
    """White base (tinted by the Skin material colour) with simple painted features."""
    PX, PY = face_canvas_coords()
    canvas = np.ones(PX.shape + (3,), np.float32)
    paint_scalp(canvas, PX, PY, (0.35, 0.33, 0.32))
    def blob(cx, cy, rx, ry, col, alpha=1.0, soft=1.5):
        d = np.sqrt(((PX - cx) / rx) ** 2 + ((PY - cy) / ry) ** 2)
        m = np.clip((1 - d) * rx / soft, 0, 1)[..., None] * alpha
        canvas[:] = canvas * (1 - m) + np.array(col)[None, None, :] * m
    for s in (-1, 1):
        ex = PHOTO_CX + s * 41
        blob(ex, PHOTO_EYE_Y, 17, 8, (1.25, 1.25, 1.25))              # sclera (brighter than base)
        blob(ex, PHOTO_EYE_Y, 8, 8, (0.16, 0.09, 0.06))               # iris
        blob(ex, PHOTO_EYE_Y, 3.5, 3.5, (0.03, 0.02, 0.02))           # pupil
        blob(ex + 2, PHOTO_EYE_Y - 2.5, 1.6, 1.6, (1.4, 1.4, 1.4))    # highlight
        blob(ex, PHOTO_EYE_Y - 6, 16, 2.2, (0.30, 0.22, 0.18), 0.8)   # upper lid line
        for k in range(9):                                            # eyebrow arc
            t = k / 8.0
            bx = ex + s * (-14 + 30 * t)
            by = PHOTO_EYE_Y - 27 - 5 * math.sin(math.pi * min(1, t * 1.25))
            blob(bx, by, 5, 3.2, (0.18, 0.13, 0.10), 0.9)
    blob(PHOTO_CX, 263, 25, 6, (0.78, 0.55, 0.52), 0.85)              # lips
    blob(PHOTO_CX, 263, 22, 1.4, (0.45, 0.30, 0.28), 0.9)             # mouth line
    blob(PHOTO_CX, 240, 14, 4, (0.80, 0.70, 0.66), 0.6)               # nose base shadow
    canvas = np.clip(canvas, 0, 1)
    paint_ear_spot(canvas, PX, PY, 0.9)
    img = np_to_image("FacePlainTex", canvas)
    if debug_dir:
        save_debug_image(img, os.path.join(debug_dir, "face_plain_tex.png"))
    return img

def build_tie_texture(debug_dir=None, w=256, h=512):
    """Royal blue with a small yellow diagonal lattice and white dots at the crossings."""
    v, u = np.mgrid[0:h, 0:w].astype(np.float32)
    u = (u + 0.5) / w * 1.0          # tie width = 1 unit (UV u)
    v = (v + 0.5) / h * 6.0          # tie length = 6 units (UV v scaled so cells stay square)
    cell = 0.2
    a = (u + v) / cell
    b = (u - v) / cell
    da = np.abs(a - np.round(a)); db = np.abs(b - np.round(b))
    line = np.clip(1 - (np.minimum(da, db) - 0.022) / 0.03, 0, 1)
    # dots at crossings
    dot = np.clip(1 - (np.sqrt(da ** 2 + db ** 2) - 0.075) / 0.04, 0, 1)
    blue = np.array(hex_srgb(TIE_BLUE)); yel = np.array(hex_srgb(TIE_YELLOW)); wht = np.array(hex_srgb(TIE_WHITE))
    # subtle weave noise
    rng = np.random.default_rng(3)
    nz = (rng.random((h, w)) - 0.5) * 0.06
    img = blue[None, None, :] * (1 + nz[..., None])
    img = img * (1 - line[..., None]) + yel[None, None, :] * line[..., None]
    img = img * (1 - dot[..., None]) + wht[None, None, :] * dot[..., None]
    img = np.clip(img, 0, 1).astype(np.float32)
    im = np_to_image("TieTex", img)
    if debug_dir:
        save_debug_image(im, os.path.join(debug_dir, "tie_tex.png"))
    return im

# =============================================================================================
# body
# =============================================================================================
def build_body_skin_mesh(subdiv=2, extra_nodes=1):
    """Skin modifier on a vertex skeleton, then Subdivision; both applied."""
    N = body_nodes()
    names = list(N.keys())
    verts, radii, edges = [], [], []
    index = {}
    def perp_radius(r, d):
        ax = max(range(3), key=lambda i: abs(d[i]))
        if ax == 2:
            return (r[0], r[1])
        if ax == 0:
            return (r[1], r[2])
        return (r[0], r[2])
    for name in names:
        co, r, parent = N[name]
        if parent is None:
            index[name] = len(verts); verts.append(co); radii.append((r[0], r[1]))
            continue
        pco, pr, _ = N[parent]
        d = co - pco
        prev = index[parent]
        for k in range(1, extra_nodes + 1):   # intermediate nodes give more control / rings
            t = k / (extra_nodes + 1)
            rr = tuple(pr[i] * (1 - t) + r[i] * t if pr[i] and r[i] else (r[i] or pr[i]) for i in range(3))
            verts.append(pco.lerp(co, t)); radii.append(perp_radius(rr, d))
            edges.append((prev, len(verts) - 1)); prev = len(verts) - 1
        index[name] = len(verts); verts.append(co); radii.append(perp_radius(r, d))
        edges.append((prev, index[name]))
    # parent radii at branch roots: use the node's own perpendicular radius from its main child
    me = bpy.data.meshes.new("BodySkel")
    me.from_pydata([tuple(v) for v in verts], edges, [])
    ob = link(bpy.data.objects.new("BodySkel", me))
    sk = ob.modifiers.new("Skin", "SKIN")
    sk.branch_smoothing = 0.6
    sk.use_smooth_shade = True
    for i, r in enumerate(radii):
        me.skin_vertices[0].data[i].radius = r
    me.skin_vertices[0].data[index["pelvis"]].use_root = True
    sub = ob.modifiers.new("Sub", "SUBSURF")
    sub.levels = subdiv; sub.render_levels = subdiv
    apply_modifiers(ob)
    ob.name = ob.data.name = "BodySkin"
    clean_mesh(ob)
    shade_smooth(ob)
    return ob

def clean_mesh(ob, dist=2e-4):
    """Skin-modifier output contains coincident verts / zero-area faces which break heat weighting."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bmesh.ops.dissolve_degenerate(bm, dist=dist, edges=bm.edges)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free()

# =============================================================================================
# head
# =============================================================================================
def _interp(z, table):
    return float(np.interp(z, HEAD_ZS, table))

def hairline_z(angle_deg):
    a = abs(((angle_deg + 180) % 360) - 180)
    xs = [p[0] for p in HAIRLINE]; ys = [p[1] for p in HAIRLINE]
    return float(np.interp(a, xs, ys))

def head_ring_params():
    rings = []
    for i in range(HEAD_RINGS_FACE):
        z = HEAD_Z_BOTTOM + (HEAD_Z_DOME - HEAD_Z_BOTTOM) * i / HEAD_RINGS_FACE
        rings.append((z, 1.0))
    for i in range(HEAD_RINGS_DOME):
        phi = (math.pi / 2) * i / HEAD_RINGS_DOME
        z = HEAD_Z_DOME + (Z_CROWN - HEAD_Z_DOME) * math.sin(phi)
        rings.append((z, math.cos(phi)))
    return rings

def head_surface_point(z, scale, a):
    """a = angle around (rad, 0 = front/-Y, +pi/2 = character's left/+X)."""
    zt = min(z, HEAD_Z_DOME)
    W = _interp(zt, HEAD_W) * scale
    taper = _interp(zt, HEAD_TAPER)
    F = _interp(zt, HEAD_FRONT) * scale
    B = _interp(zt, HEAD_BACK) * scale
    y0 = _interp(zt, HEAD_AXIS_Y)
    e = _interp(zt, HEAD_ROUND)
    s, c = math.sin(a), math.cos(a)
    se = math.copysign(abs(s) ** e, s)
    ce = math.copysign(abs(c) ** e, c)
    wf = max(c, 0.0) ** 2
    Weff = W * (1 - wf) + W * taper * wf
    x = Weff * se
    y = y0 - (F * ce if c > 0 else B * ce)
    return Vector((x, y, z))

def face_displacement(x, z):
    """Extra forward (-y) displacement for facial features, at front-facing points."""
    ax = abs(x)
    d = 0.0
    # nose: bridge -> tip -> base
    if 1.566 < z < 1.640:
        if z >= 1.598:
            A = 0.010 * smoothstep(1.638, 1.600, z) + 0.008 * smoothstep(1.610, 1.598, z)
            sx = 0.0085
        elif z >= 1.584:
            A = 0.018 + 0.006 * smoothstep(1.598, 1.586, z)
            sx = 0.010 + 0.003 * smoothstep(1.598, 1.586, z)
        else:
            A = 0.024 * smoothstep(1.566, 1.582, z)
            sx = 0.013
        d += A * gauss(x, sx)
    # nostrils / alae
    d += 0.007 * gauss(ax - 0.015, 0.008) * gauss(z - 1.578, 0.007)
    # eye sockets (push back) and brow ridge
    d -= 0.006 * gauss(ax - 0.035, 0.016) * gauss(z - 1.624, 0.011)
    d += 0.0035 * gauss(ax - 0.033, 0.028) * gauss(z - 1.646, 0.008)
    # cheekbones
    d += 0.004 * gauss(ax - 0.050, 0.020) * gauss(z - 1.595, 0.016)
    # lips and mouth crease
    d += 0.0050 * gauss(x, 0.020) * gauss(z - 1.563, 0.0055)
    d += 0.0045 * gauss(x, 0.018) * gauss(z - 1.548, 0.0055)
    d -= 0.0020 * gauss(x, 0.024) * gauss(z - 1.5555, 0.002)
    # chin
    d += 0.0040 * gauss(x, 0.017) * gauss(z - 1.522, 0.009)
    return d

def head_point(z, sc, a):
    """Head surface incl. facial features."""
    p = head_surface_point(z, sc, a)
    c = math.cos(a)
    if c > 0:
        p.y -= face_displacement(p.x, p.z) * (c ** 1.5)
    return p

def z_to_scale(z):
    """For the dome: ring scale at height z (1 below the dome)."""
    if z <= HEAD_Z_DOME:
        return 1.0
    s = min(1.0, (z - HEAD_Z_DOME) / (Z_CROWN - HEAD_Z_DOME))
    return math.cos(math.asin(s))

def build_head_bm():
    rings = head_ring_params()
    S = HEAD_SEGMENTS
    bm = bmesh.new()
    grid = []
    for (z, sc) in rings:
        row = []
        for j in range(S):
            a = 2 * math.pi * j / S
            row.append(bm.verts.new(head_point(z, sc, a)))
        grid.append(row)
    top = bm.verts.new(Vector((0, _interp(HEAD_Z_DOME, HEAD_AXIS_Y), Z_CROWN)))
    for i in range(len(grid) - 1):
        for j in range(S):
            bm.faces.new((grid[i][j], grid[i][(j + 1) % S], grid[i + 1][(j + 1) % S], grid[i + 1][j]))
    for j in range(S):
        bm.faces.new((grid[-1][j], grid[-1][(j + 1) % S], top))
    bm.normal_update()
    # make normals point outward
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def add_ears(bm):
    for s in (1, -1):
        r = bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=10, radius=1.0)
        vs = r["verts"]
        for v in vs:
            x, y, z = v.co
            # flattened ear shell, slightly cupped forward, tilted back at the top
            co = Vector((x * EAR["rx"], y * EAR["ry"], z * EAR["rz"]))
            co.x += 0.004 * (1 - (y) ** 2)          # helix rim thicker at the back edge
            co.y += 0.004 * z                       # tilt back at the top
            co.x = s * (EAR["x"] + co.x + 0.003 * (y + 1))  # back edge stands out more
            co.y += EAR["y"]; co.z += EAR["z"]
            v.co = co
        bmesh.ops.recalc_face_normals(bm, faces=list({f for v in vs for f in v.link_faces}))
    return bm

def assign_head_uvs(bm, uv_layer, project=True):
    """Front faces: orthographic projection of the photo; back faces: fixed skin/scalp spots."""
    skin_uv = photo_to_uv(*UV_SKIN_SPOT)
    scalp_uv = photo_to_uv(*UV_SCALP_SPOT)
    for f in bm.faces:
        n = f.normal
        cen = f.calc_center_median()
        back = n.y > 0.02          # (the plain townsperson face uses the same projection)
        for l in f.loops:
            if back:
                ang = math.degrees(math.atan2(cen.x, -(cen.y)))
                uv = scalp_uv if cen.z > hairline_z(ang) + 0.012 else skin_uv
            else:
                uv = photo_to_uv(*world_to_photo(l.vert.co.x, l.vert.co.z))
            l[uv_layer].uv = uv

def build_head(face_projection=True):
    bm = build_head_bm()
    uv = bm.loops.layers.uv.new("UVMap")
    assign_head_uvs(bm, uv, project=face_projection)
    # ears: plain skin UV
    n_before = set(bm.faces)
    add_ears(bm)
    skin_uv = photo_to_uv(*UV_EAR_SPOT)
    for f in bm.faces:
        if f not in n_before:
            f.smooth = True
            for l in f.loops:
                l[uv].uv = skin_uv
    for f in bm.faces:
        f.smooth = True
    return obj_from_bm("Head", bm)

# =============================================================================================
# hair
# =============================================================================================
def fringe_tongue(deg):
    """Wavy fringe: lock-shaped tongues of the hair edge hanging over the forehead (metres below the hairline)."""
    a = ((deg + 180) % 360) - 180
    # irregular locks: phase-warped period, amplitude varying per lock; long locks at the front,
    # small wisps elsewhere so the hair edge never reads as a straight helmet rim
    warp = math.radians(a) * 21 + 1.8 + 1.2 * math.sin(math.radians(a) * 6.3 + 0.4)
    t = abs(math.cos(warp / 2))          # U-shaped locks: rounded tips, sharp partings
    amp = 0.0050 + 0.0105 * (1.0 - smoothstep(30, 58, abs(a)))
    amp *= (0.75 + 0.25 * math.sin(math.radians(a) * 4.1 + 1.3)) * (1 - 0.85 * gauss(abs(a) - 92, 16))  # none over the ears
    return amp * t ** 0.9

def hair_edge_z(deg, fringe):
    return hairline_z(deg) - (fringe_tongue(deg) if fringe else 0.0)

def build_hair(name, thick_top=0.017, thick_side=0.007, thick_back=0.011, front_overhang=0.010, upper_side=0.014,
               lump=0.009, wave_scale=34.0, fringe=True, seed=1):
    # hair surface as its own grid: columns around the head, rows from the hairline up to the crown,
    # so the hairline edge is a clean curve (no stair-steps)
    S, NR = 112, 22
    bm = bmesh.new()
    grid = []
    for i in range(NR):
        u = i / NR
        row = []
        for j in range(S):
            a = 2 * math.pi * j / S
            hz = hair_edge_z(math.degrees(a), fringe) - 0.004
            z = hz + (Z_CROWN - hz) * (1 - (1 - u) ** 1.7)
            row.append(bm.verts.new(head_point(z, z_to_scale(z), a)))
        grid.append(row)
    pole = bm.verts.new(Vector((0, _interp(HEAD_Z_DOME, HEAD_AXIS_Y), Z_CROWN)))
    for i in range(NR - 1):
        for j in range(S):
            bm.faces.new((grid[i][j], grid[i][(j + 1) % S], grid[i + 1][(j + 1) % S], grid[i + 1][j]))
    for j in range(S):
        bm.faces.new((grid[-1][j], grid[-1][(j + 1) % S], pole))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    if bm.faces[len(bm.faces) // 2].normal.dot(bm.faces[len(bm.faces) // 2].calc_center_median()
                                              - Vector((0, 0, 1.62))) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
        bm.normal_update()
    offs = Vector((seed * 3.1, seed * 1.7, seed * 0.3))
    newco = {}
    for v in bm.verts:
        co = v.co.copy()
        ang = math.degrees(math.atan2(co.x, -co.y))
        aa = abs(((ang + 180) % 360) - 180)
        hz = hair_edge_z(ang, fringe)
        edge = smoothstep(hz - 0.004, hz + 0.022, co.z)   # 0 at the hairline -> 1 inside
        top = smoothstep(1.64, 1.71, co.z)
        side = 1.0 - top
        base = thick_side * (1 - smoothstep(100, 160, aa)) + thick_back * smoothstep(100, 160, aa)
        t = base * side + thick_top * top
        # fuller at the front top (overhang over the forehead)
        t += front_overhang * gauss(aa, 50) * smoothstep(1.650, 1.695, co.z) * (1 - smoothstep(1.715, 1.745, co.z))
        # fuller upper sides (the photo hair is wider than the skull above the temples), short at the ears
        t += upper_side * gauss(aa - 85, 45) * smoothstep(1.645, 1.685, co.z) * (1 - smoothstep(1.71, 1.74, co.z))
        t *= edge
        # lumpy, wavy volume: cellular clumps (curls) + flowing waves
        p = co * wave_scale + offs
        f1 = noise.noise(p, noise_basis="VORONOI_F1")
        clump = 1.0 - smoothstep(0.0, 0.75, f1)
        crease = noise.noise(p * 1.0, noise_basis="VORONOI_F2F1")
        n2 = noise.noise(co * wave_scale * 2.2 + offs * 2)
        wav = math.sin(co.z * 230 + co.x * 90 + 5 * noise.noise(co * 14 + offs))
        disp = lump * (0.9 * clump - 0.35 + 0.35 * smoothstep(0.0, 0.25, crease) + 0.25 * n2 + 0.25 * wav)
        disp *= (0.25 + 0.75 * edge) * (0.45 + 0.55 * top)
        newco[v] = co + v.normal * (max(0.0012, t + disp + 0.0015))
    for v, c in newco.items():
        v.co = c
    # thickness so the shell edge reads as hair, not paper
    bm.normal_update()
    hair = obj_from_bm(name, bm)
    sol = hair.modifiers.new("Solid", "SOLIDIFY")
    sol.thickness = 0.005; sol.offset = -1.0; sol.use_even_offset = True
    apply_modifiers(hair)
    shade_smooth(hair)
    return hair

# =============================================================================================
# clothing: shells derived from the body surface
# =============================================================================================
def shell_from(src_ob, name, keep, offset, cuts=(), material=None, smooth_iters=0, splits=()):
    """Copy src faces whose centre satisfies keep(c), push out along normals by offset(co, n).
    cuts: planes that remove the side the normal points to; splits: planes that only add clean edges
    (so a later keep() test produces a straight boundary)."""
    bm = bmesh.new(); bm.from_mesh(src_ob.data)
    for (co, no) in cuts:   # clean planar boundaries; keeps the side the normal points away from
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_outer=True)
    for (co, no) in splits:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no)
    kill = [f for f in bm.faces if not keep(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.normal_update()
    newco = {v: v.co + v.normal * offset(v.co, v.normal) for v in bm.verts}
    for v, c in newco.items():
        v.co = c
    if smooth_iters:
        for _ in range(smooth_iters): bmesh.ops.smooth_vert(bm, verts=bm.verts[:], factor=0.5,
                              use_axis_x=True, use_axis_y=True, use_axis_z=True)
    ob = obj_from_bm(name, bm)
    if material:
        ob.data.materials.append(material)
    shade_smooth(ob)
    return ob

def boundary_loop_verts(bm, zmax):
    return [v for v in bm.verts if v.is_boundary and v.co.z < zmax]

def extrude_hem(ob, zmax, drop, flare, steps=2):
    """Extrude the lower open boundary downwards and outwards (jacket skirt / flare)."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    for k in range(steps):
        edges = [e for e in bm.edges if e.is_boundary and all(v.co.z < zmax for v in e.verts)]
        r = bmesh.ops.extrude_edge_only(bm, edges=edges)
        nv = [g for g in r["geom"] if isinstance(g, bmesh.types.BMVert)]
        for v in nv:
            rad = Vector((v.co.x, v.co.y + 0.005, 0))
            if rad.length > 1e-6:
                rad.normalize()
            v.co += rad * (flare / steps) + Vector((0, 0, -drop / steps))
        zmax = min(v.co.z for v in nv) + 0.002
    bm.normal_update()
    bm.to_mesh(ob.data); bm.free()

def body_bvh(body):
    bm = bmesh.new(); bm.from_mesh(body.data)
    t = BVHTree.FromBMesh(bm); bm.free()
    return t

def front_y(bvh, x, z, default=-0.1):
    hit = bvh.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)))
    return hit[0].y if hit[0] is not None else default

def strip_mesh(bm, rows, uvs=None, uv_layer=None):
    """rows: list of lists of Vectors (same length) -> quad strip."""
    vr = [[bm.verts.new(p) for p in row] for row in rows]
    faces = []
    for i in range(len(vr) - 1):
        for j in range(len(vr[i]) - 1):
            f = bm.faces.new((vr[i][j], vr[i][j + 1], vr[i + 1][j + 1], vr[i + 1][j]))
            if uvs is not None:
                for l, (ii, jj) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
                    l[uv_layer].uv = uvs[ii][jj]
            faces.append(f)
    return faces

# --- suit pieces -------------------------------------------------------------------------------
V_BOTTOM_Z = 1.075       # jacket V opening (top button) height
V_TOP_Z = 1.43
V_TOP_HALF = 0.080       # half width of the V at V_TOP_Z (straight edges, continues above)

def v_half(z):
    return max(0.0, V_TOP_HALF * min(1.0, (z - V_BOTTOM_Z) / (V_TOP_Z - V_BOTTOM_Z)))

def build_jacket(body, mat):
    SLEEVE_END = 0.684
    def keep(c):
        # V opening (shirt and tie show); straight edges come from the bisect planes below
        if c.z > V_BOTTOM_Z and c.y < -0.01 and abs(c.x) < v_half(c.z):
            return False
        return True
    def off(co, n):
        o = 0.017
        if abs(co.x) < 0.2 and co.z < 1.15:   # body of the jacket hangs a little looser lower down
            o += 0.006 * smoothstep(1.15, 0.95, co.z)
        if abs(co.x) > 0.16 and co.z > 1.36:  # padded shoulders
            o += 0.006 * gauss(abs(co.x) - 0.19, 0.05) * smoothstep(1.38, 1.43, co.z)
        return o
    cuts = [((0, 0, JACKET_SKIRT_TOP), (0, 0, -1)), ((0, 0, 1.486), (0, 0, 1)),
            ((SLEEVE_END, 0, 0), (1, 0, 0)), ((-SLEEVE_END, 0, 0), (-1, 0, 0))]
    dz, dx = V_TOP_Z - V_BOTTOM_Z, V_TOP_HALF
    splits = [((0, 0, V_BOTTOM_Z), Vector((dz, 0, -dx)).normalized()),
              ((0, 0, V_BOTTOM_Z), Vector((-dz, 0, -dx)).normalized()),
              ((V_TOP_HALF, 0, 0), Vector((1, 0, 0))), ((-V_TOP_HALF, 0, 0), Vector((1, 0, 0)))]
    ob = shell_from(body, "Jacket", keep, off, cuts, mat, splits=splits)
    jacket_skirt(ob)
    shade_smooth(ob)
    return ob

JACKET_SKIRT_TOP = 0.90   # body shell is cut here; below it the jacket is a lofted, slightly flared skirt
JACKET_HEM_Z = 0.78

def skirt_ellipse(z):
    k = max(0.0, 1.0 - z)
    return 0.158 + 0.07 * k, 0.110 + 0.035 * k     # half width (x), half depth (y)

def _to_ellipse(co, z, minimum_only=True, ell=skirt_ellipse):
    cy = 0.006
    d = Vector((co.x, co.y - cy))
    r = d.length
    if r < 1e-6:
        return co
    rx, ry = ell(z)
    sx, sy = d.x / r, d.y / r
    R = 1.0 / math.sqrt((sx / rx) ** 2 + (sy / ry) ** 2)
    if minimum_only and r >= R:
        return Vector((co.x, co.y, z))
    return Vector((sx * R, cy + sy * R, z))

def jacket_skirt(ob, steps=4, top=None, hem=None, ell=skirt_ellipse):
    top = JACKET_SKIRT_TOP if top is None else top
    hem = JACKET_HEM_Z if hem is None else hem
    bm = bmesh.new(); bm.from_mesh(ob.data)
    # lower torso: fill the waist/hip dips so the jacket hangs straight
    for v in bm.verts:
        if v.co.z < 1.05 and abs(v.co.x) < 0.3:
            w = smoothstep(1.05, 0.97, v.co.z)
            tgt = _to_ellipse(v.co, v.co.z, ell=ell)
            v.co = v.co.lerp(tgt, w)
    # extrude the hem down to JACKET_HEM_Z with a slight flare
    zcur = top
    for k in range(steps):
        edges = [e for e in bm.edges if e.is_boundary and all(v.co.z < zcur + 0.003 for v in e.verts)]
        r = bmesh.ops.extrude_edge_only(bm, edges=edges)
        nv = [g for g in r["geom"] if isinstance(g, bmesh.types.BMVert)]
        znew = top - (top - hem) * (k + 1) / steps
        for v in nv:
            v.co = _to_ellipse(v.co, znew, minimum_only=False, ell=ell)
        zcur = znew
    for _ in range(2):
        bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if v.co.z < 1.0], factor=0.5,
                              use_axis_x=True, use_axis_y=True, use_axis_z=False)
    bm.normal_update()
    bm.to_mesh(ob.data); bm.free()

def surface_y(jacket_bvh, body_bvh_, x, z, off_body=0.020):
    """Front surface of the jacket at (x, z); inside the V falls back to body + jacket offset."""
    yb = front_y(body_bvh_, x, z) - off_body
    hit = jacket_bvh.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)))
    if hit[0] is not None and hit[0].y < yb + 0.006:
        return min(hit[0].y, yb)
    return yb

def build_lapels(body, jacket, mat):
    bvh = body_bvh(body); jb = body_bvh(jacket)
    bm = bmesh.new()
    for s in (1, -1):
        rows = []
        zs = np.linspace(V_BOTTOM_Z, V_TOP_Z + 0.008, 18)
        for z in zs:
            vh = v_half(z)
            # notch lapel: widest just below the notch (~1.33), smooth narrower collar part above
            w = 0.010 + 0.054 * smoothstep(V_BOTTOM_Z, 1.32, z) - 0.030 * smoothstep(1.33, 1.38, z) - 0.010 * smoothstep(1.38, 1.44, z)
            row = []
            for u in np.linspace(0, 1, 6):
                x = s * (vh + w * u - 0.003)
                roll = 0.003 * (1 - u) * smoothstep(1.45, 1.15, z)    # lapel roll stands off at the edge
                y = surface_y(jb, bvh, x, z) - 0.003 - roll
                row.append(Vector((x, y, z)))
            rows.append(row if s > 0 else list(reversed(row)))
        strip_mesh(bm, rows)
    ob = obj_from_bm("Lapels", bm)
    sol = ob.modifiers.new("Solid", "SOLIDIFY"); sol.thickness = 0.004; sol.offset = 1.0
    apply_modifiers(ob)
    ob.data.materials.append(mat)
    shade_smooth(ob)
    return ob

def build_shirt(body, mat):
    def keep(c):
        return c.y < 0.01 and abs(c.x) < 0.12     # only the part that shows in the jacket V
    def off(co, n):
        return 0.0075 if abs(co.x) < 0.3 else 0.0065
    cuts = [((0, 0, 1.0), (0, 0, -1)), ((0, 0, 1.47), (0, 0, 1))]
    shirt = shell_from(body, "Shirt", keep, off, cuts, mat, smooth_iters=3)
    # cuffs: separate rings around the wrists (just past the jacket sleeves)
    bm = bmesh.new(); bm.from_mesh(shirt.data)
    bvh = body_bvh(body)
    for s in (1, -1):
        rows = []
        for x in np.linspace(0.672, 0.706, 4):
            row = []
            for k in range(25):
                th = 2 * math.pi * k / 24
                d = Vector((0, math.cos(th), math.sin(th)))
                o = Vector((s * x, 0, ARM_Z))
                hit = bvh.ray_cast(o + d * 0.2, -d)
                r = (hit[0] - o).length if hit[0] is not None else 0.03
                row.append(o + d * (r + 0.0075))
            rows.append(row)
        strip_mesh(bm, rows)
    # collar band around the neck, with two points at the front
    head_bm = build_head_bm(); hb = BVHTree.FromBMesh(head_bm)
    rows = []
    n = 33
    for zt in np.linspace(0, 1, 5):
        row = []
        for k in range(n):
            a = math.radians(-162 + 324 * k / (n - 1))      # gap at the front (a=0 is front)
            d = Vector((math.sin(a), -math.cos(a), 0))
            z_lo = 1.440 - 0.036 * gauss(abs(math.degrees(a)) - 22, 14)   # collar points
            z_hi = 1.494 - 0.010 * gauss(abs(math.degrees(a)), 30)
            z = z_lo + (z_hi - z_lo) * zt
            o = Vector((0, 0.012, z))
            hit = hb.ray_cast(o + d * 0.2, -d)
            r = (hit[0] - o).length if hit[0] is not None else 0.056
            spread = 0.0035 + 0.008 * (1 - zt) * gauss(abs(math.degrees(a)) - 25, 18)
            row.append(o + d * (r + 0.004 + spread))
        rows.append(row)
    strip_mesh(bm, rows)
    head_bm.free()
    bm.normal_update()
    bm.to_mesh(shirt.data); bm.free()
    sol = shirt.modifiers.new("Solid", "SOLIDIFY"); sol.thickness = 0.002; sol.offset = 1.0
    apply_modifiers(shirt)
    shade_smooth(shirt)
    return shirt

TIE_TOP = 1.424

def build_tie(body, mat):
    bvh = body_bvh(body)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    # blade
    rows, uvs = [], []
    zs = np.linspace(TIE_TOP, 1.02, 22)
    for i, z in enumerate(zs):
        t = i / (len(zs) - 1)
        w = 0.016 + 0.024 * t           # half width
        row, uvr = [], []
        for u in np.linspace(-1, 1, 5):
            x = u * w
            zz = z - (0.030 * (1 - abs(u)) if i == len(zs) - 1 else 0)   # pointed tip
            y = front_y(bvh, x, zz) - 0.0105 - 0.004 * (1 - u * u)
            row.append(Vector((x, y, zz)))
            uvr.append(((u + 1) / 2, (TIE_TOP - zz) / 0.45))
        rows.append(row); uvs.append(uvr)
    strip_mesh(bm, rows, uvs, uvl)
    # knot (small trapezoid block)
    rows, uvs = [], []
    for i, z in enumerate(np.linspace(TIE_TOP + 0.038, TIE_TOP - 0.004, 5)):
        t = i / 4
        w = 0.019 - 0.006 * t
        row, uvr = [], []
        for u in np.linspace(-1, 1, 5):
            x = u * w
            y = front_y(bvh, 0, 1.44) - 0.016 - 0.008 * (1 - u * u) - 0.004
            row.append(Vector((x, y, z))); uvr.append(((u + 1) / 2, t * 0.1))
        rows.append(row); uvs.append(uvr)
    strip_mesh(bm, rows, uvs, uvl)
    ob = obj_from_bm("Tie", bm)
    sol = ob.modifiers.new("Solid", "SOLIDIFY"); sol.thickness = 0.004; sol.offset = 1.0
    apply_modifiers(ob)
    ob.data.materials.append(mat)
    shade_smooth(ob)
    return ob

def jacket_front_y(jbvh, x, z):
    hit = jbvh.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)))
    return hit[0].y if hit[0] is not None else -0.12

def build_buttons(jacket, mat):
    jb = body_bvh(jacket)
    bm = bmesh.new()
    for z in (V_BOTTOM_Z - 0.012, V_BOTTOM_Z - 0.112):
        y = jacket_front_y(jb, 0, z) - 0.0015
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.0085, radius2=0.0072, depth=0.004,
                              matrix=Matrix.Translation((0, y, z)) @ Matrix.Rotation(math.radians(90), 4, "X"))
    ob = obj_from_bm("Buttons", bm)
    ob.data.materials.append(mat)
    return ob

def build_pocket(jacket, body, mat):
    """Chest welt pocket on his left breast + two hip flaps, as thin raised strips on the jacket."""
    jb = body_bvh(jacket); bb = body_bvh(body)
    bm = bmesh.new()
    def flap(xa, xb, z, h):
        rows = []
        for zz in (z, z - h):
            row = []
            for x in np.linspace(xa, xb, 8):
                y = jacket_front_y(jb, x, zz)
                if y > front_y(bb, x, zz) - 0.012:      # ray went through an opening: sit on the jacket offset
                    y = front_y(bb, x, zz) - 0.019
                row.append(Vector((x, y - 0.0012, zz)))
            rows.append(row)
        strip_mesh(bm, rows)
    flap(0.060, 0.128, 1.262, 0.014)          # chest pocket on his left (+x), as in the photo
    flap(0.050, 0.140, 0.905, 0.032)
    flap(-0.140, -0.050, 0.905, 0.032)
    ob = obj_from_bm("Pockets", bm)
    sol = ob.modifiers.new("Solid", "SOLIDIFY"); sol.thickness = 0.003; sol.offset = 1.0
    apply_modifiers(ob)
    ob.data.materials.append(mat)
    shade_smooth(ob)
    return ob

def build_trousers(body, mat, name="Trousers"):
    def keep(c):
        return abs(c.x) < 0.25
    def off(co, n):
        o = 0.011 + 0.010 * smoothstep(0.45, 0.12, co.z)   # straight leg, slight break at the hem
        return o
    cuts = [((0, 0, 0.072), (0, 0, -1)), ((0, 0, 0.985), (0, 0, 1))]
    ob = shell_from(body, name, keep, off, cuts, mat)
    return ob

def build_shoes(body, mat, name="Shoes"):
    def keep(c):
        return True
    def off(co, n):
        o = 0.011
        if co.y < -0.05:
            o += 0.006 * smoothstep(-0.05, -0.15, co.y)     # roomier toe box
        return o
    cuts = [((0, 0, 0.125), (0, 0, 1))]
    ob = shell_from(body, name, keep, off, cuts, mat)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    # flat sole and a slight heel
    for v in bm.verts:
        if v.co.z < 0.002:
            v.co.z = 0.002 - (0.002 - v.co.z) * 0.15
        if v.co.y < -0.12:
            v.co.y -= 0.008 * smoothstep(-0.12, -0.18, v.co.y)
    bm.to_mesh(ob.data); bm.free()
    shade_smooth(ob)
    return ob

# --- casual pieces (townsperson) ------------------------------------------------------------------
def build_tshirt(body, mat):
    SLEEVE = 0.335
    neck_no = Vector((0, -0.45, 1)).normalized()       # crew neck: lower at the front than at the back
    def keep(c):
        near_neck = math.hypot(c.x, c.y - 0.01) < 0.076
        return not (near_neck and neck_no.dot(c - Vector((0, 0, 1.462))) > 0)
    def off(co, n):
        o = 0.011
        if abs(co.x) > 0.2:
            o += 0.008 * smoothstep(0.2, SLEEVE, abs(co.x))   # loose short sleeves
        if co.z < 1.0:
            o += 0.006 * smoothstep(1.0, 0.86, co.z)
        return o
    cuts = [((0, 0, 0.92), (0, 0, -1)), ((0, 0, 1.52), (0, 0, 1)),
            ((SLEEVE, 0, 0), (1, 0, 0)), ((-SLEEVE, 0, 0), (-1, 0, 0))]
    ob = shell_from(body, "Top", keep, off, cuts, mat, splits=[((0, 0, 1.462), tuple(neck_no))])
    # loose hem hanging straight over the trousers (same loft as the jacket skirt, tighter)
    jacket_skirt(ob, steps=2, top=0.92, hem=0.855,
                 ell=lambda z: (0.160 + 0.03 * max(0.0, 1.0 - z), 0.112 + 0.02 * max(0.0, 1.0 - z)))
    shade_smooth(ob)
    return ob

# =============================================================================================
# assembling characters (mesh stage only - no rig)
# =============================================================================================
def cull_hidden(body, hidden):
    """Delete body faces that are fully covered by clothing (less overdraw / poke-through)."""
    bm = bmesh.new(); bm.from_mesh(body.data)
    kill = [f for f in bm.faces if all(hidden(v.co) for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(body.data); bm.free()

def join_into(target, others):
    with bpy.context.temp_override(active_object=target, object=target, selected_objects=[target] + others,
                                   selected_editable_objects=[target] + others):
        bpy.ops.object.join()
    return target

def copy_object(ob, name):
    c = ob.copy(); c.data = ob.data.copy(); c.name = c.data.name = name
    return link(c)

def build_body_proxy(skin_mat, face_projection):
    """Returns (body_proxy, head_proxy, clothes_src). The proxies are the complete, un-culled skin
    surfaces used as the weight source in skin_meshes(); clothes are derived from clothes_src."""
    body = build_body_skin_mesh()
    head = build_head(face_projection)
    # body UVs: all on the plain-skin spot of the face texture
    uv = body.data.uv_layers.new(name="UVMap")
    su = photo_to_uv(*UV_SKIN_SPOT)
    for l in uv.data:
        l.uv = su
    for ob in (body, head):
        ob.data.materials.clear(); ob.data.materials.append(skin_mat)
        shade_smooth(ob)
    clothes_src = copy_object(body, "ClothSource")
    body.name = body.data.name = "BodyProxy"
    head.name = head.data.name = "HeadProxy"
    return body, head, clothes_src

def visible_body(body_proxy, head_proxy, hidden, name="Body"):
    ob = copy_object(body_proxy, name)
    cull_hidden(ob, hidden)
    join_into(ob, [copy_object(head_proxy, name + "_head")])
    ob.name = ob.data.name = name
    return ob

def build_avatar_meshes(debug_dir=None):
    photo = load_photo()
    try:
        skin = sample_skin(photo)
    except Exception:
        skin = hex_srgb(SKIN_FALLBACK)
    print("skin sample (sRGB):", skin)
    face_img = build_face_texture_photo(photo, skin, debug_dir)
    tie_img = build_tie_texture(debug_dir)
    M = {
        "Skin": make_material("Skin", rough=0.55, image=face_img, spec=0.4),
        "Hair": make_material("Hair", HAIR_COLOR, rough=0.62, sheen=0.35, sheen_tint=HAIR_SHEEN, spec=0.3),
        "Jacket": make_material("Jacket", JACKET_COLOR, rough=0.72, sheen=0.35, sheen_tint="#3a4058"),
        "Shirt": make_material("Shirt", SHIRT_COLOR, rough=0.65, sheen=0.15, sheen_tint="#ffffff"),
        "Tie": make_material("Tie", rough=0.45, image=tie_img, sheen=0.4, sheen_tint="#8fa8ff"),
        "Trousers": make_material("Trousers", TROUSER_COLOR, rough=0.70, sheen=0.3, sheen_tint="#3a4058"),
        "Shoes": make_material("Shoes", SHOE_COLOR, rough=0.30, coat=0.6, spec=0.6),
        "Buttons": make_material("Buttons", BUTTON_COLOR, rough=0.25, spec=0.6),
    }
    proxy, head, src = build_body_proxy(M["Skin"], face_projection=True)
    jacket = build_jacket(src, M["Jacket"])
    parts = [
        jacket,
        build_lapels(src, jacket, M["Jacket"]),
        build_pocket(jacket, src, M["Jacket"]),
        build_buttons(jacket, M["Buttons"]),
        build_shirt(src, M["Shirt"]),
        build_tie(src, M["Tie"]),
        build_trousers(src, M["Trousers"]),
        build_shoes(src, M["Shoes"]),
        build_hair("Hair", seed=1),
    ]
    parts[-1].data.materials.append(M["Hair"])
    def hidden(co):
        if co.z < 1.43 and abs(co.x) < 0.655:
            return True
        return False
    body = visible_body(proxy, head, hidden)
    bpy.data.objects.remove(src)
    meshes = [body] + parts
    shift = ground_meshes(meshes, extra=[proxy, head])
    return dict(proxy=proxy, head=head, meshes=meshes, rigid={"Hair": "mixamorig:Head"}, shift=shift)

def build_person_meshes(debug_dir=None):
    face_img = build_face_texture_plain(debug_dir)
    M = {
        "Skin": make_material("Skin", PERSON_SKIN, rough=0.55, image=face_img, spec=0.4),
        "Hair": make_material("Hair", PERSON_HAIR, rough=0.5, sheen=0.3, sheen_tint="#6a5040"),
        "Top": make_material("Top", PERSON_TOP, rough=0.8, sheen=0.25, sheen_tint="#ffffff"),
        "Bottom": make_material("Bottom", PERSON_BOTTOM, rough=0.75, sheen=0.2, sheen_tint="#ffffff"),
        "Shoes": make_material("Shoes", PERSON_SHOES, rough=0.5),
    }
    proxy, head, src = build_body_proxy(M["Skin"], face_projection=False)
    hair = build_hair("Hair", thick_top=0.016, thick_side=0.006, thick_back=0.008, front_overhang=0.008, upper_side=0.004,
                      lump=0.004, wave_scale=40.0, fringe=False, seed=5)
    hair.data.materials.append(M["Hair"])
    parts = [
        build_tshirt(src, M["Top"]),
        build_trousers(src, M["Bottom"], name="Bottom"),
        build_shoes(src, M["Shoes"]),
        hair,
    ]
    def hidden(co):
        return co.z < 1.40 and abs(co.x) < 0.30
    body = visible_body(proxy, head, hidden)
    bpy.data.objects.remove(src)
    meshes = [body] + parts
    shift = ground_meshes(meshes, extra=[proxy, head])
    return dict(proxy=proxy, head=head, meshes=meshes, rigid={"Hair": "mixamorig:Head"}, shift=shift)

def ground_meshes(obs, extra=()):
    """Translate so the lowest point (shoe sole) is exactly at z=0. Returns the z shift."""
    zmin = min(v.co.z for ob in obs for v in ob.data.vertices)
    obs = list(obs) + list(extra)
    for ob in obs:
        for v in ob.data.vertices:
            v.co.z -= zmin
    return -zmin

# =============================================================================================
# rig + skinning (separate from mesh building)
# =============================================================================================
def build_armature(name="Armature", z_shift=0.0):
    J = mixamo_joints()
    arm_data = bpy.data.armatures.new(name)
    arm = link(bpy.data.objects.new(name, arm_data))
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones
    up = Vector((0, 0, z_shift))
    for bname, (h, t, parent) in J.items():
        b = eb.new(bname)
        b.head = h + up; b.tail = t + up
    for bname, (h, t, parent) in J.items():
        b = eb[bname]
        if parent:
            b.parent = eb[parent]
            b.use_connect = (eb[parent].tail - b.head).length < 1e-5
        # roll: keep bone Z axis pointing forward(-Y) for vertical bones, up(+Z) for limbs along X
        d = (b.tail - b.head).normalized()
        if abs(d.z) > 0.7:
            b.align_roll(Vector((0, -1, 0)))
        else:
            b.align_roll(Vector((0, 0, 1)))
    bpy.ops.object.mode_set(mode="OBJECT")
    arm_data.bones["mixamorig:HeadTop_End"].use_deform = False
    arm.show_in_front = True
    return arm

def _select_only(obs, active):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active

def skin_meshes(arm, proxy, head_proxy, meshes, rigid=None):
    """Automatic (bone-heat) weights on the full body proxy; the head proxy gets a smooth Neck->Head
    blend; the merged proxy is then the weight source for every exported mesh (Data Transfer,
    nearest-face interpolated), so clothes follow the body exactly. Meshes named in `rigid` are bound
    100% to one bone (hair -> Head)."""
    rigid = rigid or {}
    _select_only([proxy, arm], arm)
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    empty = [vg.name for vg in proxy.vertex_groups if vg.name != "mixamorig:Head"
             if not any(g.group == vg.index and g.weight > 0.05 for v in proxy.data.vertices for g in v.groups)]
    if empty:
        raise RuntimeError("bone heat weighting failed for: %s" % empty)
    # head: Neck below the jaw, Head above (smooth blend)
    zh = (arm.matrix_world @ arm.data.bones["mixamorig:Head"].head_local).z
    gh = head_proxy.vertex_groups.new(name="mixamorig:Head")
    gn = head_proxy.vertex_groups.new(name="mixamorig:Neck")
    for v in head_proxy.data.vertices:
        w = smoothstep(zh - 0.035, zh + 0.015, v.co.z)
        if w > 0:
            gh.add([v.index], w, "REPLACE")
        if w < 1:
            gn.add([v.index], 1 - w, "REPLACE")
    head_proxy.parent = None
    join_into(proxy, [head_proxy])
    groups = [vg.name for vg in proxy.vertex_groups]
    print("auto-weight groups on proxy:", len(groups))
    for ob in meshes:
        for g in list(ob.vertex_groups):
            ob.vertex_groups.remove(g)
        if ob.name in rigid:
            vg = ob.vertex_groups.new(name=rigid[ob.name])
            vg.add(list(range(len(ob.data.vertices))), 1.0, "REPLACE")
        else:
            for g in groups:
                ob.vertex_groups.new(name=g)
            dt = ob.modifiers.new("DT", "DATA_TRANSFER")
            dt.object = proxy
            dt.use_vert_data = True
            dt.data_types_verts = {"VGROUP_WEIGHTS"}
            dt.vert_mapping = "POLYINTERP_NEAREST"
            dt.layers_vgroup_select_src = "ALL"
            dt.layers_vgroup_select_dst = "NAME"
            apply_modifiers(ob)
            limit_and_clean_weights(ob)
        ob.parent = arm
        ob.matrix_parent_inverse = Matrix.Identity(4)
        m = ob.modifiers.new("Armature", "ARMATURE")
        m.object = arm
    # the proxy only serves as weight source
    proxy.hide_render = True
    proxy.hide_set(True)

def limit_and_clean_weights(ob, limit=4):
    me = ob.data
    for v in me.vertices:
        gs = sorted(((g.group, g.weight) for g in v.groups), key=lambda t: -t[1])
        keep = [g for g in gs[:limit] if g[1] > 0.01]
        tot = sum(w for _, w in keep) or 1.0
        drop = [g for g, _ in gs if g not in [k for k, _ in keep]]
        for g in drop:
            ob.vertex_groups[g].remove([v.index])
        for g, w in keep:
            ob.vertex_groups[g].add([v.index], w / tot, "REPLACE")
    # remove empty groups? keep all (harmless; glTF uses joints only)

# =============================================================================================
# posing helpers
# =============================================================================================
def rotate_bone_world(arm, bname, axis, deg):
    pb = arm.pose.bones[bname]
    head = pb.head.copy()   # armature space
    R = Matrix.Translation(head) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-head)
    pb.matrix = R @ pb.matrix
    bpy.context.view_layer.update()

def reset_pose(arm):
    for pb in arm.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()

def pose_relaxed(arm):
    reset_pose(arm)
    rotate_bone_world(arm, "mixamorig:LeftArm", "Y", 80)
    rotate_bone_world(arm, "mixamorig:RightArm", "Y", -80)
    # slight elbow bend forward and hands in
    for side, s in (("Left", 1), ("Right", -1)):
        pb = arm.pose.bones["mixamorig:%sForeArm" % side]
        axis = (pb.matrix.to_3x3() @ Vector((0, 0, 1))).normalized()
        rotate_bone_world(arm, "mixamorig:%sForeArm" % side, Vector((1, 0, 0)), -12)
        rotate_bone_world(arm, "mixamorig:%sArm" % side, Vector((1, 0, 0)), -4)

def pose_deform_test(arm):
    reset_pose(arm)
    # elbow 90 deg (forearm forward), knee 90 deg (shin backward)
    rotate_bone_world(arm, "mixamorig:LeftForeArm", "Z", -90)
    rotate_bone_world(arm, "mixamorig:RightForeArm", "Z", 90)
    rotate_bone_world(arm, "mixamorig:LeftLeg", "X", -90)
    rotate_bone_world(arm, "mixamorig:RightUpLeg", "X", 45)
    rotate_bone_world(arm, "mixamorig:RightLeg", "X", -90)

# =============================================================================================
# export
# =============================================================================================
def export_glb(path, arm, meshes):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    reset_pose(arm)
    _select_only([arm] + meshes, arm)
    props = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    kw = dict(filepath=path, export_format="GLB", use_selection=True, export_yup=True,
              export_apply=False, export_texcoords=True, export_normals=True, export_materials="EXPORT",
              export_image_format="JPEG", export_jpeg_quality=88, export_image_quality=88,
              export_skins=True, export_animations=False, export_morph=False, export_cameras=False,
              export_lights=False, export_def_bones=False, export_leaf_bone=False,
              export_influence_nb=4, export_extras=False, export_tangents=False)
    kw = {k: v for k, v in kw.items() if k in props}
    if os.environ.get("AVATAR_PROFILE"):
        import cProfile, pstats
        pr = cProfile.Profile(); pr.enable()
        bpy.ops.export_scene.gltf(**kw)
        pr.disable(); pstats.Stats(pr).sort_stats("tottime").print_stats(12)
    else:
        bpy.ops.export_scene.gltf(**kw)
    print("exported", path, os.path.getsize(path), "bytes")

# =============================================================================================
# rendering
# =============================================================================================
def setup_render_scene(res=(900, 1200)):
    sc = bpy.context.scene
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            sc.render.engine = eng
            break
        except Exception:
            continue
    try:
        sc.eevee.taa_render_samples = 48
    except Exception:
        pass
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    try:
        sc.view_settings.view_transform = "Standard"
        sc.view_settings.look = "None"
        sc.view_settings.exposure = 0.0
    except Exception:
        pass
    world = bpy.data.worlds.new("World"); sc.world = world
    try:
        world.use_nodes = True
    except Exception:
        pass
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.42, 0.43, 0.45, 1)
    bg.inputs["Strength"].default_value = 0.55
    def light(name, loc, energy, size, color=(1, 1, 1)):
        ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.size = size; ld.color = color
        lo = link(bpy.data.objects.new(name, ld)); lo.location = loc
        d = Vector((0, 0, 1.3)) - Vector(loc)
        lo.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return lo
    light("Key", (-1.6, -2.4, 2.4), 150, 1.6, (1.0, 0.97, 0.93))
    light("Fill", (2.0, -2.2, 1.6), 70, 2.0, (0.92, 0.95, 1.0))
    light("Rim", (0.6, 2.4, 2.4), 130, 1.5)
    # floor
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=6)
    fl = obj_from_bm("Floor", bm)
    fl.data.materials.append(make_material("Floor", "#8a8c90", rough=0.9))
    cam_d = bpy.data.cameras.new("Cam")
    cam = link(bpy.data.objects.new("Cam", cam_d))
    sc.camera = cam
    return cam

def aim_camera(cam, target, yaw_deg, dist, height, lens=50, ortho=None):
    yaw = math.radians(yaw_deg)
    # yaw 0 = in front of the character (-Y), positive = towards character's left (+X)
    pos = Vector((math.sin(yaw) * dist, -math.cos(yaw) * dist, height))
    cam.location = pos
    cam.rotation_euler = (Vector(target) - pos).to_track_quat("-Z", "Y").to_euler()
    if ortho:
        cam.data.type = "ORTHO"; cam.data.ortho_scale = ortho
    else:
        cam.data.type = "PERSP"; cam.data.lens = lens
    cam.data.clip_start = 0.05; cam.data.clip_end = 50

def render_to(path, res=None):
    sc = bpy.context.scene
    if res:
        sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("render", path)

def render_avatar_set(prefix, arm, full=True):
    cam = setup_render_scene()
    os.makedirs(RENDER_DIR, exist_ok=True)
    views = [("front", 0), ("threequarter", 35), ("side", 90)]
    poses = [("tpose", reset_pose), ("relaxed", pose_relaxed)] if full else [("tpose", reset_pose)]
    for pname, pfun in poses:
        pfun(arm)
        for vname, yaw in views if full else views[:1]:
            wide = pname == "tpose" and vname != "side"
            res = (1200, 1000) if wide else (800, 1200)
            aim_camera(cam, (0, 0, 0.9), yaw, 3.2 if wide else 3.0, 1.0, lens=50)
            render_to(os.path.join(RENDER_DIR, "%s_%s_%s.png" % (prefix, vname, pname)), res)
        if not full:
            break
    reset_pose(arm)
    return cam

def render_face(prefix, arm, cam, z_shift):
    reset_pose(arm)
    zc = Z_EYE + z_shift - 0.03
    aim_camera(cam, (0, 0, zc), 0, 0.95, zc, lens=85)
    render_to(os.path.join(RENDER_DIR, "%s_face_closeup.png" % prefix), (900, 1000))
    aim_camera(cam, (0, 0, zc), 35, 0.95, zc, lens=85)
    render_to(os.path.join(RENDER_DIR, "%s_face_threequarter.png" % prefix), (900, 1000))
    aim_camera(cam, (0, 0, zc), 90, 0.95, zc, lens=85)
    render_to(os.path.join(RENDER_DIR, "%s_face_side.png" % prefix), (900, 1000))

def render_deform_test(prefix, arm, cam):
    pose_deform_test(arm)
    aim_camera(cam, (0, 0, 0.9), 50, 3.3, 1.1, lens=50)
    render_to(os.path.join(RENDER_DIR, "%s_deform_test.png" % prefix), (1000, 1100))
    reset_pose(arm)

# =============================================================================================
# main
# =============================================================================================
def report(meshes, arm, path):
    tris = {ob.name: tri_count(ob) for ob in meshes}
    mats = sorted({m.name for ob in meshes for m in ob.data.materials if m})
    print("== %s" % path)
    print("   triangles:", sum(tris.values()), tris)
    print("   materials:", mats)
    zs = [ (ob.matrix_world @ v.co).z for ob in meshes for v in ob.data.vertices]
    print("   height (incl. hair): %.4f m, min z %.4f" % (max(zs), min(zs)))

def run_character(kind, args):
    reset_scene()
    dbg = args.get("debug_dir")
    if kind == "avatar":
        data = build_avatar_meshes(dbg)
        out = AVATAR_GLB
    else:
        data = build_person_meshes(dbg)
        out = PERSON_GLB
    arm = build_armature("Armature", z_shift=data["shift"])
    skin_meshes(arm, data["proxy"], data["head"], data["meshes"], data["rigid"])
    reset_pose(arm)
    export_glb(out, arm, data["meshes"])
    report(data["meshes"], arm, out)
    os.makedirs(BLEND_DIR, exist_ok=True)
    if not args.get("no_render"):
        if kind == "avatar":
            cam = render_avatar_set("avatar", arm, full=True)
            render_face("avatar", arm, cam, data["shift"])
            render_deform_test("avatar", arm, cam)
        else:
            cam = render_avatar_set("person", arm, full=False)
            render_face("person", arm, cam, data["shift"])
    bpy.context.preferences.filepaths.save_version = 0      # no .blend1 backups
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND_DIR, "%s.blend" % kind), compress=True)

def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    a = {"only": None, "no_render": False, "debug_dir": None}
    i = 0
    while i < len(argv):
        if argv[i] == "--only":
            a["only"] = argv[i + 1]; i += 2
        elif argv[i] == "--no-render":
            a["no_render"] = True; i += 1
        elif argv[i] == "--debug-dir":
            a["debug_dir"] = argv[i + 1]; i += 2
        else:
            i += 1
    return a

def main():
    args = parse_args()
    kinds = [args["only"]] if args["only"] else ["avatar", "person"]
    for k in kinds:
        run_character(k, args)

if __name__ == "__main__":
    main()
