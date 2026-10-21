// ocr — on-screen text of still frames with macOS Vision (offline, free).
//
// usage: ocr <img1.jpg> [img2.jpg ...]
// Prints one JSON object per image on stdout:
//   {"file": "...", "w": 1920, "h": 1080, "lines": [{"text": "...", "conf": 0.98,
//     "box": [x, y, w, h]  (pixels, origin top-left), "hrel": 0.07 (line height / frame height)}]}
// Languages: es-ES, en-US. Level: accurate, with language correction off (display type is often not dictionary words).
//
// Build: swiftc -O ocr.swift -o bin/ocr
import Foundation
import Vision
import AppKit

func esc(_ s: String) -> String {
    var o = ""
    for c in s.unicodeScalars {
        switch c {
        case "\"": o += "\\\""
        case "\\": o += "\\\\"
        case "\n": o += "\\n"
        case "\r": o += "\\r"
        case "\t": o += "\\t"
        default:
            if c.value < 0x20 { o += String(format: "\\u%04x", c.value) } else { o.unicodeScalars.append(c) }
        }
    }
    return o
}

let args = Array(CommandLine.arguments.dropFirst())
if args.isEmpty {
    FileHandle.standardError.write("usage: ocr <image> [...]\n".data(using: .utf8)!)
    exit(1)
}

for path in args {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        print("{\"file\": \"\(esc(path))\", \"error\": \"cannot read\"}")
        continue
    }
    let W = Double(cg.width), H = Double(cg.height)
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    req.recognitionLanguages = ["es-ES", "en-US"]
    req.minimumTextHeight = 0.012
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    var parts: [String] = []
    do {
        try handler.perform([req])
        for obs in req.results ?? [] {
            guard let top = obs.topCandidates(1).first else { continue }
            let b = obs.boundingBox  // normalized, origin bottom-left
            let x = b.minX * W, y = (1 - b.maxY) * H, w = b.width * W, h = b.height * H
            parts.append(String(format: "{\"text\": \"%@\", \"conf\": %.2f, \"box\": [%.0f, %.0f, %.0f, %.0f], \"hrel\": %.4f}",
                                esc(top.string), top.confidence, x, y, w, h, b.height))
        }
        print("{\"file\": \"\(esc(path))\", \"w\": \(Int(W)), \"h\": \(Int(H)), \"lines\": [\(parts.joined(separator: ", "))]}")
    } catch {
        print("{\"file\": \"\(esc(path))\", \"error\": \"\(esc(error.localizedDescription))\"}")
    }
}
