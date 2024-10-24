import axios from "axios";
import { useStore } from "@/store";
import { toast } from "sonner";

const instance = axios.create();

instance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 503) {
      toast.error(err.response?.data);
      useStore.getState().setNeedLogin(true);
    }
    return Promise.reject(err);
  }
);

export default instance;
