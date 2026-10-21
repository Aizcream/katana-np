// cutout — subject cut-out (background removal) with macOS Vision, offline and free.
// Lifts the foreground subject(s) of a photo into a transparent PNG (sticker looks, product hero shots, carousels).
//
// usage: cutout <in.jpg|png> <out.png> [--crop] [--all]
//   --crop   trim the PNG to the subject's bounding box (+2 % margin)
//   --all    keep every detected instance (default: all instances too; flag kept for clarity)
// Prints JSON: {"out": "...", "w": .., "h": .., "instances": n, "bbox": [x, y, w, h]} or {"error": "..."}.
// Needs macOS 14+ (VNGenerateForegroundInstanceMaskRequest). Build: swiftc -O cutout.swift -o bin/cutout
import Foundation
import Vision
import CoreImage
import AppKit
import UniformTypeIdentifiers

let a = Array(CommandLine.arguments.dropFirst())
let files = a.filter { !$0.hasPrefix("--") }
if files.count < 2 { FileHandle.standardError.write("usage: cutout <in> <out.png> [--crop]\n".data(using: .utf8)!); exit(1) }
let crop = a.contains("--crop")
func fail(_ m: String) -> Never { print("{\"error\": \"\(m)\"}"); exit(2) }

guard let ns = NSImage(contentsOfFile: files[0]), let cg = ns.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fail("cannot read \(files[0])") }
let req = VNGenerateForegroundInstanceMaskRequest()
let h = VNImageRequestHandler(cgImage: cg, options: [:])
do { try h.perform([req]) } catch { fail("vision: \(error.localizedDescription)") }
guard let obs = req.results?.first else { fail("no subject found") }
let buf: CVPixelBuffer
do { buf = try obs.generateMaskedImage(ofInstances: obs.allInstances, from: h, croppedToInstancesExtent: false) } catch { fail("mask: \(error.localizedDescription)") }
var ci = CIImage(cvPixelBuffer: buf)
let ctx = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])
var bbox = ci.extent
if crop {
    // bounding box of alpha > 0.04
    guard let full = ctx.createCGImage(ci, from: ci.extent) else { fail("render") }
    let W = full.width, H = full.height
    var data = [UInt8](repeating: 0, count: W * H * 4)
    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    let bc = CGContext(data: &data, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    bc.draw(full, in: CGRect(x: 0, y: 0, width: W, height: H))
    var x0 = W, y0 = H, x1 = 0, y1 = 0
    for y in 0..<H { for x in 0..<W where data[(y * W + x) * 4 + 3] > 10 { if x < x0 { x0 = x }; if x > x1 { x1 = x }; if y < y0 { y0 = y }; if y > y1 { y1 = y } } }
    if x1 > x0 && y1 > y0 {
        let m = Int(Double(max(x1 - x0, y1 - y0)) * 0.02)
        x0 = max(0, x0 - m); y0 = max(0, y0 - m); x1 = min(W - 1, x1 + m); y1 = min(H - 1, y1 + m)
        // data rows are top-down after drawing into the bitmap context; CI coordinates are bottom-up
        bbox = CGRect(x: x0, y: H - 1 - y1, width: x1 - x0 + 1, height: y1 - y0 + 1)
        ci = ci.cropped(to: bbox).transformed(by: CGAffineTransform(translationX: -bbox.minX, y: -bbox.minY))
    }
}
guard let outCG = ctx.createCGImage(ci, from: ci.extent) else { fail("render") }
let url = URL(fileURLWithPath: files[1])
guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else { fail("cannot write \(files[1])") }
CGImageDestinationAddImage(dest, outCG, nil)
if !CGImageDestinationFinalize(dest) { fail("cannot write \(files[1])") }
print("{\"out\": \"\(files[1])\", \"w\": \(outCG.width), \"h\": \(outCG.height), \"instances\": \(obs.allInstances.count), \"bbox\": [\(Int(bbox.minX)), \(Int(bbox.minY)), \(Int(bbox.width)), \(Int(bbox.height))]}")
