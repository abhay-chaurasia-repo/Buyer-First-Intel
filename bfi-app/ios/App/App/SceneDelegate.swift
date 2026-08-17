import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let night = UIColor(red: 42.0 / 255.0, green: 31.0 / 255.0, blue: 32.0 / 255.0, alpha: 1)

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = night
        let root = CAPBridgeViewController()
        root.view.backgroundColor = night
        window?.rootViewController = root
        window?.makeKeyAndVisible()

        paintWebView(in: root.view, color: night)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak root] in
            guard let view = root?.view else { return }
            self.paintWebView(in: view, color: night)
        }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    private func paintWebView(in view: UIView, color: UIColor) {
        view.backgroundColor = color
        if let webView = view as? WKWebView {
            webView.isOpaque = true
            webView.backgroundColor = color
            webView.scrollView.backgroundColor = color
            return
        }
        for child in view.subviews {
            paintWebView(in: child, color: color)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
