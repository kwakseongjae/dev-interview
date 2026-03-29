"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const DELETION_REASONS = [
  "더 이상 서비스를 이용하지 않아요",
  "다른 서비스를 사용하고 있어요",
  "원하는 기능이 부족해요",
  "개인정보가 걱정돼요",
  "기타",
] as const;

const CONFIRM_TEXT = "탈퇴합니다";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (reason: string | null) => Promise<void>;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  onDelete,
}: DeleteAccountDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmInput === CONFIRM_TEXT;

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(selectedReason);
    } catch {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (isDeleting) return;
    if (!value) {
      setConfirmInput("");
      setSelectedReason(null);
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl">회원탈퇴</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                이 작업은 되돌릴 수 없습니다
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 안내 메시지 */}
          <div className="rounded-lg bg-muted/50 border border-border/60 p-3 text-sm text-muted-foreground space-y-1.5">
            <p>회원탈퇴 시 다음 사항이 적용됩니다:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>계정이 비활성화되어 데이터에 접근할 수 없습니다</li>
              <li>
                <span className="text-foreground font-medium">15일 이내</span>에
                동일 계정으로 로그인하면 복구할 수 있습니다
              </li>
              <li>15일이 지나면 모든 데이터가 영구 삭제됩니다</li>
            </ul>
          </div>

          {/* 탈퇴 사유 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              탈퇴 사유 <span className="text-muted-foreground">(선택)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DELETION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() =>
                    setSelectedReason(selectedReason === reason ? null : reason)
                  }
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedReason === reason
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* 확인 입력 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              확인을 위해{" "}
              <span className="text-destructive font-semibold">
                {CONFIRM_TEXT}
              </span>
              를 입력해주세요
            </label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={CONFIRM_TEXT}
              disabled={isDeleting}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col pt-2">
          <Button
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            variant="destructive"
            className="w-full"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                탈퇴 처리 중...
              </>
            ) : (
              "회원탈퇴"
            )}
          </Button>
          <Button
            onClick={() => handleOpenChange(false)}
            variant="ghost"
            disabled={isDeleting}
            className="w-full"
          >
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
