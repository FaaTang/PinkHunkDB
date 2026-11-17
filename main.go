package main

import (
	"context"
	"os"
	"runtime/debug"
	"strings"

	"GoNavi-Wails/internal/app"
	"GoNavi-Wails/internal/logger"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

func main() {
	// Create an instance of the app structure
	application := app.NewApp()
	lowMemoryMode := isLowMemoryMode()
	// 正常模式 GOGC=50；低内存模式更积极（40）。前端 SyncMemoryPolicy 可在运行时再次调整。
	gcPercent := 50
	if lowMemoryMode {
		gcPercent = 40
	}
	debug.SetGCPercent(gcPercent)
	backgroundColour := &options.RGBA{R: 0, G: 0, B: 0, A: 0}
	windowsBackdrop := windows.Acrylic
	if lowMemoryMode {
		backgroundColour = &options.RGBA{R: 255, G: 255, B: 255, A: 255}
		windowsBackdrop = windows.None
	}

	// Width/Height must be set for Wails window creation; StartHidden keeps them off-screen
	// until frontend applies screen-ratio first-open size or restores the user's bounds.
	err := wails.Run(&options.App{
		Title:            "PinkHunkDB",
		Width:            900,
		Height:           560,
		MinWidth:         900,
		MinHeight:        560,
		WindowStartState: options.Normal,
		StartHidden:      true,
		Frameless:        true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: backgroundColour,
		OnStartup: func(ctx context.Context) {
			app.InitializeLifecycle(application, ctx)
		},
		OnShutdown: func(ctx context.Context) {
			application.Shutdown()
		},
		Bind: []interface{}{
			application,
		},
		Windows: &windows.Options{
			WebviewIsTransparent:              !lowMemoryMode,
			WindowIsTranslucent:               !lowMemoryMode,
			BackdropType:                      windowsBackdrop,
			DisableWindowIcon:                 false,
			DisableFramelessWindowDecorations: false,
			WebviewUserDataPath:               resolveWindowsWebviewUserDataPath(),
			// 低内存模式：禁用 WebView2 硬件加速（--disable-gpu）。下次启动生效，与透明窗口层一致。
			WebviewGpuIsDisabled: lowMemoryMode,
		},
		Mac: &mac.Options{
			WebviewIsTransparent: !lowMemoryMode,
			WindowIsTranslucent:  !lowMemoryMode,
		},
		Linux: resolveLinuxOptions(lowMemoryMode),
	})

	if err != nil {
		logger.Error(err, "应用启动失败")
	}
}

func isLowMemoryMode() bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("GONAVI_LOW_MEMORY_MODE"))) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func resolveLinuxOptions(lowMemoryMode bool) *linux.Options {
	if lowMemoryMode {
		return &linux.Options{
			WebviewGpuPolicy: linux.WebviewGpuPolicyNever,
		}
	}
	// Wails 在未传 Linux 选项时默认 WebviewGpuPolicyNever，正常模式显式恢复按需加速。
	return &linux.Options{
		WebviewGpuPolicy: linux.WebviewGpuPolicyOnDemand,
	}
}
