'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const DeleteConfirmation = ({ eventId }: { eventId: string }) => {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [response, setResponse] = useState<string>("");

  const handleDeleteEvent = useCallback(
    async ({ eventId, path }: { eventId: string; path: string }) => {
      await axios
        .delete(`/api/events?id=${eventId}&path=${path}`)
        .then((response) => {
          const message = response.data.message || 'Event deleted successfully';
          console.log(message);
          setResponse(message);
        })
        .catch((error) => {
          const errMessage = error.response?.data?.error || error.message;
          console.error("Error deleting event:", errMessage);
          alert(errMessage);
        });
    },
    [pathname]
  );

  useEffect(() => {
    if (response) {
      window.location.reload();
      setResponse("");
    }
  }, [response]);

  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <Image src="/assets/icons/delete.svg" alt="edit" width={20} height={20} />
      </AlertDialogTrigger>

      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete?</AlertDialogTitle>
          <AlertDialogDescription className="p-regular-16 text-grey-600">
            This will permanently delete this event
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                await handleDeleteEvent({ eventId, path: pathname })
              })
            }>
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteConfirmation;