"""应用启动器 - 适配backend结构的统一启动文件"""
import os
import sys
import time
import threading
import webbrowser
import signal
import atexit
import multiprocessing
import logging
from pathlib import Path

# PyInstaller + multiprocessing 兼容性：必须在主入口调用 freeze_support
# 否则打包后的exe会无限fork进程，导致进程爆炸
multiprocessing.freeze_support()

# 设置工作目录和模块路径
if getattr(sys, 'frozen', False):
    # 打包后的环境
    if hasattr(sys, '_MEIPASS'):
        base_dir = Path(sys._MEIPASS)
        backend_dir = base_dir / "backend"
    else:
        base_dir = Path(sys.executable).parent
        backend_dir = base_dir / "backend"
else:
    # 开发环境
    base_dir = Path(__file__).parent
    backend_dir = base_dir / "backend"

if backend_dir.exists():
    os.chdir(backend_dir)
    sys.path.insert(0, str(backend_dir))
else:
    print(f"ERROR: backend目录不存在: {backend_dir}")
    input("按回车键退出...")


def get_logger():
    """获取启动器日志器（日志由backend/app/main.py统一配置）"""
    return logging.getLogger("launcher")


logger = get_logger()

# 全局变量用于进程管理
uvicorn_server = None
server_thread = None
server_should_stop = False

def cleanup_server():
    """清理服务器进程"""
    global uvicorn_server, server_thread, server_should_stop

    logger.info("正在关闭服务器...")
    server_should_stop = True

    # 尝试优雅关闭uvicorn服务器
    if uvicorn_server:
        try:
            uvicorn_server.should_exit = True
            logger.info("服务器已设置关闭标志")
        except:
            pass

    # 强制终止占用8000端口的进程 (仅Windows)
    try:
        import subprocess
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
        for line in result.stdout.split('\n'):
            if ':8000' in line and 'LISTENING' in line:
                parts = line.split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    try:
                        subprocess.run(['taskkill', '/F', '/PID', pid],
                                     capture_output=True, check=True)
                        logger.info(f"已终止占用8000端口的进程 PID: {pid}")
                    except:
                        pass
    except:
        pass

def signal_handler(signum, frame):
    """信号处理器"""
    logger.info(f"收到信号 {signum}，正在关闭服务...")
    cleanup_server()
    sys.exit(0)

def main():
    """主函数"""
    global uvicorn_server, server_thread, server_should_stop

    logger.info("="*50)
    logger.info("AI写标书助手 - 启动中...")
    logger.info("="*50)

    # 注册信号处理器
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, signal_handler)
    if hasattr(signal, 'SIGINT'):
        signal.signal(signal.SIGINT, signal_handler)

    # 注册退出处理器
    atexit.register(cleanup_server)

    try:
        logger.info(f"切换到backend目录: {os.getcwd()}")
        logger.info("启动服务器...")

        def start_server():
            global uvicorn_server, server_should_stop
            try:
                import uvicorn
                # 动态导入app.main模块
                try:
                    from app.main import app
                except ImportError as ie:
                    logger.error(f"无法导入app.main: {ie}")
                    logger.error(f"当前工作目录: {os.getcwd()}")
                    logger.error(f"Python路径: {sys.path[:3]}")
                    raise ie

                # 创建uvicorn配置
                config = uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="warning")
                uvicorn_server = uvicorn.Server(config)

                # 运行服务器
                uvicorn_server.run()

            except Exception as e:
                if not server_should_stop:
                    logger.error(f"服务启动失败: {e}")
                    logger.exception("详细错误信息:")

        # 创建非守护线程，但添加退出处理
        server_thread = threading.Thread(target=start_server, daemon=False)
        server_thread.start()

        logger.info("等待服务启动...")
        time.sleep(5)

        def open_browser():
            if not server_should_stop:
                time.sleep(2)
                try:
                    webbrowser.open('http://localhost:8000')
                    logger.info("浏览器已打开")
                except Exception as e:
                    logger.warning(f"打开浏览器失败: {e}")

        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()

        logger.info("服务启动完成，访问地址: http://localhost:8000")
        logger.info("API文档: http://localhost:8000/docs")
        logger.info("健康检查: http://localhost:8000/health")
        logger.info("完整功能已集成，关闭此窗口会自动停止服务")
        logger.info("按 Ctrl+C 可以安全退出")

        # 等待服务器线程，或者直到收到退出信号
        try:
            while server_thread.is_alive() and not server_should_stop:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("收到退出信号...")

    except KeyboardInterrupt:
        logger.info("服务已关闭")
    except Exception as e:
        logger.error(f"运行时错误: {e}")
        logger.exception("详细错误信息:")
    finally:
        cleanup_server()
        logger.info("程序已退出")

if __name__ == "__main__":
    main()