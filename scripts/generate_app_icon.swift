import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let output = root.appendingPathComponent("ios-vercel-wrapper/VerseRain/Assets.xcassets/AppIcon.appiconset/Icon-1024.png")
let size = CGSize(width: 1024, height: 1024)
let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size.width),
    pixelsHigh: Int(size.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
)!
let graphicsContext = NSGraphicsContext(bitmapImageRep: bitmap)!

func color(_ hex: UInt32, alpha: CGFloat = 1) -> NSColor {
    let r = CGFloat((hex >> 16) & 0xff) / 255
    let g = CGFloat((hex >> 8) & 0xff) / 255
    let b = CGFloat(hex & 0xff) / 255
    return NSColor(calibratedRed: r, green: g, blue: b, alpha: alpha)
}

func strokePath(_ path: NSBezierPath, strokeColor: NSColor, width: CGFloat, shadow: Bool = false) {
    if shadow {
        let shadowPath = path.copy() as! NSBezierPath
        let transform = AffineTransform(translationByX: 0, byY: -10)
        shadowPath.transform(using: transform)
        color(0x0f172a, alpha: 0.18).setStroke()
        shadowPath.lineWidth = width + 8
        shadowPath.lineCapStyle = .round
        shadowPath.lineJoinStyle = .round
        shadowPath.stroke()
    }
    strokeColor.setStroke()
    path.lineWidth = width
    path.lineCapStyle = .round
    path.lineJoinStyle = .round
    path.stroke()
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = graphicsContext
let context = graphicsContext.cgContext

let rect = CGRect(origin: .zero, size: size)
context.setFillColor(color(0x3b82f6).cgColor)
context.fill(rect)

let gradient = CGGradient(
    colorsSpace: CGColorSpaceCreateDeviceRGB(),
    colors: [
        color(0x7dd3fc).cgColor,
        color(0x3b82f6).cgColor,
        color(0x2563eb).cgColor,
        color(0x1d4ed8).cgColor
    ] as CFArray,
    locations: [0.0, 0.42, 0.72, 1.0]
)!
context.drawLinearGradient(
    gradient,
    start: CGPoint(x: 120, y: 980),
    end: CGPoint(x: 940, y: 80),
    options: [.drawsBeforeStartLocation, .drawsAfterEndLocation]
)

let glow = CGGradient(
    colorsSpace: CGColorSpaceCreateDeviceRGB(),
    colors: [
        color(0xffffff, alpha: 0.28).cgColor,
        color(0xffffff, alpha: 0.00).cgColor
    ] as CFArray,
    locations: [0.0, 1.0]
)!
context.drawRadialGradient(
    glow,
    startCenter: CGPoint(x: 320, y: 780),
    startRadius: 8,
    endCenter: CGPoint(x: 320, y: 780),
    endRadius: 560,
    options: []
)

for i in 0..<12 {
    let x = CGFloat(80 + i * 82)
    let y = CGFloat(870 - (i % 4) * 120)
    let rain = NSBezierPath()
    rain.move(to: CGPoint(x: x, y: y))
    rain.line(to: CGPoint(x: x + 54, y: y - 152))
    strokePath(rain, strokeColor: color(0xffffff, alpha: 0.18), width: 18)
}

let cloud = NSBezierPath()
cloud.move(to: CGPoint(x: 256, y: 506))
cloud.curve(
    to: CGPoint(x: 392, y: 391),
    controlPoint1: CGPoint(x: 258, y: 431),
    controlPoint2: CGPoint(x: 315, y: 377)
)
cloud.curve(
    to: CGPoint(x: 560, y: 319),
    controlPoint1: CGPoint(x: 423, y: 305),
    controlPoint2: CGPoint(x: 506, y: 271)
)
cloud.curve(
    to: CGPoint(x: 700, y: 394),
    controlPoint1: CGPoint(x: 614, y: 345),
    controlPoint2: CGPoint(x: 644, y: 381)
)
cloud.curve(
    to: CGPoint(x: 792, y: 517),
    controlPoint1: CGPoint(x: 758, y: 397),
    controlPoint2: CGPoint(x: 792, y: 448)
)
cloud.curve(
    to: CGPoint(x: 674, y: 640),
    controlPoint1: CGPoint(x: 792, y: 586),
    controlPoint2: CGPoint(x: 742, y: 640)
)
cloud.line(to: CGPoint(x: 365, y: 640))
cloud.curve(
    to: CGPoint(x: 256, y: 506),
    controlPoint1: CGPoint(x: 302, y: 640),
    controlPoint2: CGPoint(x: 256, y: 581)
)
cloud.transform(using: AffineTransform(translationByX: 0, byY: 120))

strokePath(cloud, strokeColor: .white, width: 58, shadow: true)

let inner = NSBezierPath()
inner.move(to: CGPoint(x: 417, y: 521))
inner.line(to: CGPoint(x: 607, y: 521))
inner.move(to: CGPoint(x: 452, y: 584))
inner.line(to: CGPoint(x: 572, y: 584))
inner.transform(using: AffineTransform(translationByX: 0, byY: 120))
strokePath(inner, strokeColor: color(0xdbeafe, alpha: 0.82), width: 22)

let dropXs: [CGFloat] = [382, 466, 550, 634]
for (index, x) in dropXs.enumerated() {
    let drop = NSBezierPath()
    drop.move(to: CGPoint(x: x, y: 382))
    drop.line(to: CGPoint(x: x, y: index == 1 || index == 2 ? 210 : 252))
    strokePath(drop, strokeColor: .white, width: 42, shadow: true)
}

let goldDrop = NSBezierPath()
goldDrop.move(to: CGPoint(x: 706, y: 382))
goldDrop.line(to: CGPoint(x: 760, y: 222))
strokePath(goldDrop, strokeColor: color(0xfbbf24), width: 38, shadow: true)

NSGraphicsContext.restoreGraphicsState()

guard let data = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Could not encode PNG")
}

try data.write(to: output)

let tempJPEG = output.deletingLastPathComponent().appendingPathComponent("Icon-1024-opaque-temp.jpg")
let toJPEG = Process()
toJPEG.executableURL = URL(fileURLWithPath: "/usr/bin/sips")
toJPEG.arguments = [
    "-z", "1024", "1024",
    "-s", "format", "jpeg",
    "-s", "formatOptions", "100",
    output.path,
    "--out", tempJPEG.path
]
try toJPEG.run()
toJPEG.waitUntilExit()

let toPNG = Process()
toPNG.executableURL = URL(fileURLWithPath: "/usr/bin/sips")
toPNG.arguments = ["-s", "format", "png", tempJPEG.path, "--out", output.path]
try toPNG.run()
toPNG.waitUntilExit()
try? FileManager.default.removeItem(at: tempJPEG)

print(output.path)
