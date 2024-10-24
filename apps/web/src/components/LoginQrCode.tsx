import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { useCountDown } from "ahooks";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { useStore } from "@/store";

const countdown = 40 * 1000; // 40s

async function fetchQrCode(): Promise<{ url: string; uid: string }> {
  const { data } = await axios.get("/api/weread/loginQrCode");
  return data;
}

async function getLoginInfo(uid: string) {
  const { data } = await axios.get(`/api/weread/loginInfo?uid=${uid}`, {
    timeout: countdown,
  });
  return data;
}

export function LoginQrCode() {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [uid, setUid] = useState<string>();
  const needLogin = useStore.use.needLogin();

  const [targetDate, setTargetDate] = useState<number>();

  const [countdown] = useCountDown({
    targetDate,
    onEnd: () => {
      setQrCodeUrl("");
    },
  });

  useEffect(() => {
    if (!uid) return;
    getLoginInfo(uid)
      .then((data) => {
        console.log(data);
        useStore.getState().setNeedLogin(false);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [uid]);

  function generateQrCode() {
    setTargetDate(Date.now() + countdown);
    fetchQrCode().then((data) => {
      setQrCodeUrl(data.url);
      setUid(data.uid);
    });
  }

  return (
    <>
      <Drawer
        open={needLogin}
        onOpenChange={(needLogin) => useStore.getState().setNeedLogin(needLogin)}
      >
        <DrawerContent>
          <div className="w-full max-w-sm mx-auto">
            <DrawerHeader className="text-center">
              <DrawerTitle>登录微信读书</DrawerTitle>
              <DrawerDescription>
                使用微信扫码登录。若登陆后仍报错，尝试打开微信读书app，然后关闭本弹窗再进行操作。
              </DrawerDescription>
            </DrawerHeader>
            <Card>
              <CardHeader className="text-center">
                <CardTitle>微信扫码</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                {qrCodeUrl && <QRCodeSVG value={qrCodeUrl} />}
              </CardContent>
              <CardFooter className="justify-center gap-3">
                <Button onClick={generateQrCode} disabled={countdown !== 0}>
                  {!qrCodeUrl
                    ? "生成二维码"
                    : `${Math.round(countdown / 1000)}秒后重新生成`}
                </Button>

                <DrawerClose asChild>
                  <Button onClick={() => useStore.getState().setNeedLogin(false)} variant="outline">关闭</Button>
                </DrawerClose>
              </CardFooter>
            </Card>
            <DrawerFooter></DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
