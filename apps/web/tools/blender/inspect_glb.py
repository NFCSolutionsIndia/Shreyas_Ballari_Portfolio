"""
inspect_glb.py - print a summary of a GLB (no dependencies; runs in Blender's Python or any Python 3).

  blender.exe -b --factory-startup --python inspect_glb.py -- path/to/file.glb [more.glb ...]
  python inspect_glb.py path/to/file.glb
"""
import json, os, struct, sys

def read_glb(path):
    with open(path, "rb") as f:
        data = f.read()
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    assert magic == b"glTF", "not a GLB"
    off = 12
    js, binc = None, None
    while off < length:
        clen, ctype = struct.unpack_from("<I4s", data, off)
        chunk = data[off + 8: off + 8 + clen]
        if ctype == b"JSON":
            js = json.loads(chunk.decode("utf-8"))
        elif ctype == b"BIN\x00":
            binc = chunk
        off += 8 + clen
    return js, binc

def summarize(path):
    g, _ = read_glb(path)
    print("=" * 70)
    print(path, "%.2f MB" % (os.path.getsize(path) / 1e6))
    print("extensionsUsed:", g.get("extensionsUsed", []))
    acc = g["accessors"]
    total = 0
    for m in g.get("meshes", []):
        for p in m["primitives"]:
            n = acc[p["indices"]]["count"] // 3 if "indices" in p else acc[p["attributes"]["POSITION"]]["count"] // 3
            total += n
            pos = acc[p["attributes"]["POSITION"]]
            mat = g["materials"][p["material"]]["name"] if "material" in p else None
            print("  mesh %-10s mat %-9s tris %6d  min %s max %s" % (
                m["name"], mat, n, [round(x, 3) for x in pos["min"]], [round(x, 3) for x in pos["max"]]))
    print("triangles total:", total)
    print("materials:", [m["name"] for m in g.get("materials", [])])
    for m in g.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        print("   %-9s base %s rough %s metal %s tex %s ext %s" % (
            m["name"], [round(x, 3) for x in pbr.get("baseColorFactor", [1, 1, 1, 1])],
            pbr.get("roughnessFactor", 1), pbr.get("metallicFactor", 1),
            "baseColorTexture" in pbr, list(m.get("extensions", {}).keys())))
    print("images:", [(i.get("name"), i.get("mimeType")) for i in g.get("images", [])])
    nodes = g["nodes"]
    for s in g.get("skins", []):
        joints = s["joints"]
        names = [nodes[j]["name"] for j in joints]
        print("skin joints (%d):" % len(names))
        parent = {}
        for i, n in enumerate(nodes):
            for c in n.get("children", []):
                parent[c] = i
        def depth(j):
            d = 0
            while j in parent and parent[j] in joints:
                j = parent[j]; d += 1
            return d
        for j in joints:
            print("   " + "  " * depth(j) + nodes[j]["name"], [round(x, 3) for x in nodes[j].get("translation", [0, 0, 0])])
    skinned = [n["name"] for n in nodes if "skin" in n]
    print("skinned mesh nodes:", skinned)

if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    for p in args:
        summarize(p)
