import ffi from 'ffi-napi';
import path from 'path';
import ref from 'ref-napi';
import { getAppPath } from './AppInfoAPI';

// http://www.zezula.net/en/casc/casclib.html
// https://github.com/ladislav-zezula/CascLib/blob/master/src/CascLib.h
export type ICascLib = {
  CascCloseFile: ffi.ForeignFunction<boolean, [ref.Pointer<void>]>;
  CascCloseStorage: ffi.ForeignFunction<boolean, [ref.Pointer<void>]>;
  CascOpenFile: ffi.ForeignFunction<
    boolean,
    [ref.Pointer<void>, string, number, number, ref.Pointer<ref.Pointer<void>>]
  >;
  CascOpenStorage: ffi.ForeignFunction<
    boolean,
    [string, number, ref.Pointer<ref.Pointer<void>>]
  >;
  CascReadFile: ffi.ForeignFunction<
    boolean,
    [ref.Pointer<void>, ref.Pointer<void>, number, ref.Pointer<number>]
  >;
  GetCascError: ffi.ForeignFunction<number, []>;
};

export const voidPtr = ref.refType(ref.types.void);
export const voidPtrPtr = ref.refType(voidPtr);
export const dwordPtr = ref.refType(ref.types.uint32);

let CASC_LIB: ICascLib;

export async function initCascLib(): Promise<void> {
  let libName: string;

  switch (process.platform) {
    case 'win32':
      libName = 'CascLib.dll';
      break;
    case 'darwin':
      libName = 'CascLib';
      break;
    case 'linux':
      throw new Error('CascLib hasn\'t been compiled for Linux.');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }

  const pathLibrary = path.resolve(getAppPath(), 'tools', libName);
  CASC_LIB = ffi.Library(pathLibrary, {
    CascCloseFile: ['bool', [voidPtr]],
    CascCloseStorage: ['bool', [voidPtr]],
    CascOpenFile: ['bool', [voidPtr, 'string', 'int', 'int', voidPtrPtr]],
    CascOpenStorage: ['bool', ['string', 'int', voidPtrPtr]],
    CascReadFile: ['bool', [voidPtr, voidPtr, 'int', dwordPtr]],
    GetCascError: ['int', []],
  });
}

export function getCascLib(): ICascLib {
  return CASC_LIB;
}

// CascLib Error Codes for GetCascError()
// https://github.com/ladislav-zezula/CascLib/blob/master/src/CascPort.h#L230
// https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--0-499-
const KnownWindowsErrorCodes: { [code: number]: string } = {
  0: 'ERROR_SUCCESS: The operation completed successfully.',
  1: 'ERROR_INVALID_FUNCTION: Incorrect function.',
  2: 'ERROR_FILE_NOT_FOUND: The system cannot find the file specified.',
  3: 'ERROR_PATH_NOT_FOUND: The system cannot find the path specified.',
  4: 'ERROR_TOO_MANY_OPEN_FILES: The system cannot open the file.',
  5: 'ERROR_ACCESS_DENIED: Access is denied.',
  6: 'ERROR_INVALID_HANDLE: The handle is invalid.',
  7: 'ERROR_ARENA_TRASHED: The storage control blocks were destroyed.',
  8: 'ERROR_NOT_ENOUGH_MEMORY: Not enough memory resources are available to process this command.',
  9: 'ERROR_INVALID_BLOCK: The storage control block address is invalid.',
  10: 'ERROR_BAD_ENVIRONMENT: The environment is incorrect.',
  11: 'ERROR_BAD_FORMAT: An attempt was made to load a program with an incorrect format.',
  12: 'ERROR_INVALID_ACCESS: The access code is invalid.',
  13: 'ERROR_INVALID_DATA: The data is invalid.',
  14: 'ERROR_OUTOFMEMORY: Not enough storage is available to complete this operation.',
  15: 'ERROR_INVALID_DRIVE: The system cannot find the drive specified.',
  16: 'ERROR_CURRENT_DIRECTORY: The directory cannot be removed.',
  17: 'ERROR_NOT_SAME_DEVICE: The system cannot move the file to a different disk drive.',
  18: 'ERROR_NO_MORE_FILES: There are no more files.',
  19: 'ERROR_WRITE_PROTECT: The media is write protected.',
  20: 'ERROR_BAD_UNIT: The system cannot find the device specified.',
  21: 'ERROR_NOT_READY: The device is not ready.',
  22: 'ERROR_BAD_COMMAND: The device does not recognize the command.',
  23: 'ERROR_CRC: Data error (cyclic redundancy check).',
  24: 'ERROR_BAD_LENGTH: The program issued a command but the command length is incorrect.',
  25: 'ERROR_SEEK: The drive cannot locate a specific area or track on the disk.',
  26: 'ERROR_NOT_DOS_DISK: The specified disk or diskette cannot be accessed.',
  27: 'ERROR_SECTOR_NOT_FOUND: The drive cannot find the sector requested.',
  28: 'ERROR_OUT_OF_PAPER: The printer is out of paper.',
  29: 'ERROR_WRITE_FAULT: The system cannot write to the specified device.',
  30: 'ERROR_READ_FAULT: The system cannot read from the specified device.',
  31: 'ERROR_GEN_FAILURE: A device attached to the system is not functioning.',
  32: 'ERROR_SHARING_VIOLATION: The process cannot access the file because it is being used by another process.',
  33: 'ERROR_LOCK_VIOLATION: The process cannot access the file because another process has locked a portion of the file.',
  34: 'ERROR_WRONG_DISK: The wrong diskette is in the drive. Insert %2 (Volume Serial Number: %3) into drive %1.',
  36: 'ERROR_SHARING_BUFFER_EXCEEDED: Too many files opened for sharing.',
  38: 'ERROR_HANDLE_EOF: Reached the end of the file.',
  39: 'ERROR_HANDLE_DISK_FULL: The disk is full.',
  50: 'ERROR_NOT_SUPPORTED: The request is not supported.',
  51: 'ERROR_REM_NOT_LIST: Windows cannot find the network path. Verify that the network path is correct and the destination computer is not busy or turned off. If Windows still cannot find the network path, contact your network administrator.',
  52: 'ERROR_DUP_NAME: You were not connected because a duplicate name exists on the network. If joining a domain, go to System in Control Panel to change the computer name and try again. If joining a workgroup, choose another workgroup name.',
  53: 'ERROR_BAD_NETPATH: The network path was not found.',
  54: 'ERROR_NETWORK_BUSY: The network is busy.',
  55: 'ERROR_DEV_NOT_EXIST: The specified network resource or device is no longer available.',
  56: 'ERROR_TOO_MANY_CMDS: The network BIOS command limit has been reached.',
  57: 'ERROR_ADAP_HDW_ERR: A network adapter hardware error occurred.',
  58: 'ERROR_BAD_NET_RESP: The specified server cannot perform the requested operation.',
  59: 'ERROR_UNEXP_NET_ERR: An unexpected network error occurred.',
  60: 'ERROR_BAD_REM_ADAP: The remote adapter is not compatible.',
  61: 'ERROR_PRINTQ_FULL: The printer queue is full.',
  62: 'ERROR_NO_SPOOL_SPACE: Space to store the file waiting to be printed is not available on the server.',
  63: 'ERROR_PRINT_CANCELLED: Your file waiting to be printed was deleted.',
  64: 'ERROR_NETNAME_DELETED: The specified network name is no longer available.',
  65: 'ERROR_NETWORK_ACCESS_DENIED: Network access is denied.',
  66: 'ERROR_BAD_DEV_TYPE: The network resource type is not correct.',
  67: 'ERROR_BAD_NET_NAME: The network name cannot be found.',
  68: 'ERROR_TOO_MANY_NAMES: The name limit for the local computer network adapter card was exceeded.',
  69: 'ERROR_TOO_MANY_SESS: The network BIOS session limit was exceeded.',
  70: 'ERROR_SHARING_PAUSED: The remote server has been paused or is in the process of being started.',
  71: 'ERROR_REQ_NOT_ACCEP: No more connections can be made to this remote computer at this time because there are already as many connections as the computer can accept.',
  72: 'ERROR_REDIR_PAUSED: The specified printer or disk device has been paused.',
  80: 'ERROR_FILE_EXISTS: The file exists.',
  82: 'ERROR_CANNOT_MAKE: The directory or file cannot be created.',
  83: 'ERROR_FAIL_I24: Fail on INT 24.',
  84: 'ERROR_OUT_OF_STRUCTURES: Storage to process this request is not available.',
  85: 'ERROR_ALREADY_ASSIGNED: The local device name is already in use.',
  86: 'ERROR_INVALID_PASSWORD: The specified network password is not correct.',
  87: 'ERROR_INVALID_PARAMETER: The parameter is incorrect.',
  88: 'ERROR_NET_WRITE_FAULT: A write fault occurred on the network.',
  89: 'ERROR_NO_PROC_SLOTS: The system cannot start another process at this time.',
  100: 'ERROR_TOO_MANY_SEMAPHORES: Cannot create another system semaphore.',
  101: 'ERROR_EXCL_SEM_ALREADY_OWNED: The exclusive semaphore is owned by another process.',
  102: 'ERROR_SEM_IS_SET: The semaphore is set and cannot be closed.',
  103: 'ERROR_TOO_MANY_SEM_REQUESTS: The semaphore cannot be set again.',
  104: 'ERROR_INVALID_AT_INTERRUPT_TIME: Cannot request exclusive semaphores at interrupt time.',
  105: 'ERROR_SEM_OWNER_DIED: The previous ownership of this semaphore has ended.',
  106: 'ERROR_SEM_USER_LIMIT: Insert the diskette for drive %1.',
  107: 'ERROR_DISK_CHANGE: The program stopped because an alternate diskette was not inserted.',
  108: 'ERROR_DRIVE_LOCKED: The disk is in use or locked by another process.',
  109: 'ERROR_BROKEN_PIPE: The pipe has been ended.',
  110: 'ERROR_OPEN_FAILED: The system cannot open the device or file specified.',
  111: 'ERROR_BUFFER_OVERFLOW: The file name is too long.',
  112: 'ERROR_DISK_FULL: There is not enough space on the disk.',
  113: 'ERROR_NO_MORE_SEARCH_HANDLES: No more internal file identifiers available.',
  114: 'ERROR_INVALID_TARGET_HANDLE: The target internal file identifier is incorrect.',
  117: 'ERROR_INVALID_CATEGORY: The IOCTL call made by the application program is not correct.',
  118: 'ERROR_INVALID_VERIFY_SWITCH: The verify-on-write switch parameter value is not correct.',
  119: 'ERROR_BAD_DRIVER_LEVEL: The system does not support the command requested.',
  120: 'ERROR_CALL_NOT_IMPLEMENTED: This function is not supported on this system.',
  121: 'ERROR_SEM_TIMEOUT: The semaphore timeout period has expired.',
  122: 'ERROR_INSUFFICIENT_BUFFER: The data area passed to a system call is too small.',
  123: 'ERROR_INVALID_NAME: The filename, directory name, or volume label syntax is incorrect.',
  124: 'ERROR_INVALID_LEVEL: The system call level is not correct.',
  125: 'ERROR_NO_VOLUME_LABEL: The disk has no volume label.',
  126: 'ERROR_MOD_NOT_FOUND: The specified module could not be found.',
  127: 'ERROR_PROC_NOT_FOUND: The specified procedure could not be found.',
  128: 'ERROR_WAIT_NO_CHILDREN: There are no child processes to wait for.',
  129: 'ERROR_CHILD_NOT_COMPLETE: The %1 application cannot be run in Win32 mode.',
  130: 'ERROR_DIRECT_ACCESS_HANDLE: Attempt to use a file handle to an open disk partition for an operation other than raw disk I/O.',
  131: 'ERROR_NEGATIVE_SEEK: An attempt was made to move the file pointer before the beginning of the file.',
  132: 'ERROR_SEEK_ON_DEVICE: The file pointer cannot be set on the specified device or file.',
  133: 'ERROR_IS_JOIN_TARGET: A JOIN or SUBST command cannot be used for a drive that contains previously joined drives.',
  134: 'ERROR_IS_JOINED: An attempt was made to use a JOIN or SUBST command on a drive that has already been joined.',
  135: 'ERROR_IS_SUBSTED: An attempt was made to use a JOIN or SUBST command on a drive that has already been substituted.',
  136: 'ERROR_NOT_JOINED: The system tried to delete the JOIN of a drive that is not joined.',
  137: 'ERROR_NOT_SUBSTED: The system tried to delete the substitution of a drive that is not substituted.',
  138: 'ERROR_JOIN_TO_JOIN: The system tried to join a drive to a directory on a joined drive.',
  139: 'ERROR_SUBST_TO_SUBST: The system tried to substitute a drive to a directory on a substituted drive.',
  140: 'ERROR_JOIN_TO_SUBST: The system tried to join a drive to a directory on a substituted drive.',
  141: 'ERROR_SUBST_TO_JOIN: The system tried to SUBST a drive to a directory on a joined drive.',
  142: 'ERROR_BUSY_DRIVE: The system cannot perform a JOIN or SUBST at this time.',
  143: 'ERROR_SAME_DRIVE: The system cannot join or substitute a drive to or for a directory on the same drive.',
  144: 'ERROR_DIR_NOT_ROOT: The directory is not a subdirectory of the root directory.',
  145: 'ERROR_DIR_NOT_EMPTY: The directory is not empty.',
  146: 'ERROR_IS_SUBST_PATH: The path specified is being used in a substitute.',
  147: 'ERROR_IS_JOIN_PATH: Not enough resources are available to process this command.',
  148: 'ERROR_PATH_BUSY: The path specified cannot be used at this time.',
  149: 'ERROR_IS_SUBST_TARGET: An attempt was made to join or substitute a drive for which a directory on the drive is the target of a previous substitute.',
  150: 'ERROR_SYSTEM_TRACE: System trace information was not specified in your CONFIG.SYS file, or tracing is disallowed.',
  151: 'ERROR_INVALID_EVENT_COUNT: The number of specified semaphore events for DosMuxSemWait is not correct.',
  152: 'ERROR_TOO_MANY_MUXWAITERS: DosMuxSemWait did not execute; too many semaphores are already set.',
  153: 'ERROR_INVALID_LIST_FORMAT: The DosMuxSemWait list is not correct.',
  154: 'ERROR_LABEL_TOO_LONG: The volume label you entered exceeds the label character limit of the target file system.',
  155: 'ERROR_TOO_MANY_TCBS: Cannot create another thread.',
  156: 'ERROR_SIGNAL_REFUSED: The recipient process has refused the signal.',
  157: 'ERROR_DISCARDED: The segment is already discarded and cannot be locked.',
  158: 'ERROR_NOT_LOCKED: The segment is already unlocked.',
  159: 'ERROR_BAD_THREADID_ADDR: The address for the thread ID is not correct.',
  160: 'ERROR_BAD_ARGUMENTS: One or more arguments are not correct.',
  161: 'ERROR_BAD_PATHNAME: The specified path is invalid.',
  162: 'ERROR_SIGNAL_PENDING: A signal is already pending.',
  164: 'ERROR_MAX_THRDS_REACHED: No more threads can be created in the system.',
  167: 'ERROR_LOCK_FAILED: Unable to lock a region of a file.',
  170: 'ERROR_BUSY: The requested resource is in use.',
  171: "ERROR_DEVICE_SUPPORT_IN_PROGRESS: Device's command support detection is in progress.",
  173: 'ERROR_CANCEL_VIOLATION: A lock request was not outstanding for the supplied cancel region.',
  174: 'ERROR_ATOMIC_LOCKS_NOT_SUPPORTED: The file system does not support atomic changes to the lock type.',
  180: 'ERROR_INVALID_SEGMENT_NUMBER: The system detected a segment number that was not correct.',
  182: 'ERROR_INVALID_ORDINAL: The operating system cannot run %1.',
  183: 'ERROR_ALREADY_EXISTS: Cannot create a file when that file already exists.',
  186: 'ERROR_INVALID_FLAG_NUMBER: The flag passed is not correct.',
  187: 'ERROR_SEM_NOT_FOUND: The specified system semaphore name was not found.',
  188: 'ERROR_INVALID_STARTING_CODESEG: The operating system cannot run %1.',
  189: 'ERROR_INVALID_STACKSEG: The operating system cannot run %1.',
  190: 'ERROR_INVALID_MODULETYPE: The operating system cannot run %1.',
  191: 'ERROR_INVALID_EXE_SIGNATURE: Cannot run %1 in Win32 mode.',
  192: 'ERROR_EXE_MARKED_INVALID: The operating system cannot run %1.',
  193: 'ERROR_BAD_EXE_FORMAT: %1 is not a valid Win32 application.',
  194: 'ERROR_ITERATED_DATA_EXCEEDS_64k: The operating system cannot run %1.',
  195: 'ERROR_INVALID_MINALLOCSIZE: The operating system cannot run %1.',
  196: 'ERROR_DYNLINK_FROM_INVALID_RING: The operating system cannot run this application program.',
  197: 'ERROR_IOPL_NOT_ENABLED: The operating system is not presently configured to run this application.',
  198: 'ERROR_INVALID_SEGDPL: The operating system cannot run %1.',
  199: 'ERROR_AUTODATASEG_EXCEEDS_64k: The operating system cannot run this application program.',
  200: 'ERROR_RING2SEG_MUST_BE_MOVABLE: The code segment cannot be greater than or equal to 64K.',
  201: 'ERROR_RELOC_CHAIN_XEEDS_SEGLIM: The operating system cannot run %1.',
  202: 'ERROR_INFLOOP_IN_RELOC_CHAIN: The operating system cannot run %1.',
  203: 'ERROR_ENVVAR_NOT_FOUND: The system could not find the environment option that was entered.',
  205: 'ERROR_NO_SIGNAL_SENT: No process in the command subtree has a signal handler.',
  206: 'ERROR_FILENAME_EXCED_RANGE: The filename or extension is too long.',
  207: 'ERROR_RING2_STACK_IN_USE: The ring 2 stack is in use.',
  208: 'ERROR_META_EXPANSION_TOO_LONG: The global filename characters, * or ?, are entered incorrectly or too many global filename characters are specified.',
  209: 'ERROR_INVALID_SIGNAL_NUMBER: The signal being posted is not correct.',
  210: 'ERROR_THREAD_1_INACTIVE: The signal handler cannot be set.',
  212: 'ERROR_LOCKED: The segment is locked and cannot be reallocated.',
  214: 'ERROR_TOO_MANY_MODULES: Too many dynamic-link modules are attached to this program or dynamic-link module.',
  215: 'ERROR_NESTING_NOT_ALLOWED: Cannot nest calls to LoadModule.',
  216: "ERROR_EXE_MACHINE_TYPE_MISMATCH: This version of %1 is not compatible with the version of Windows you're running. Check your computer's system information and then contact the software publisher.",
  217: 'ERROR_EXE_CANNOT_MODIFY_SIGNED_BINARY: The image file %1 is signed, unable to modify.',
  218: 'ERROR_EXE_CANNOT_MODIFY_STRONG_SIGNED_BINARY: The image file %1 is strong signed, unable to modify.',
  220: 'ERROR_FILE_CHECKED_OUT: This file is checked out or locked for editing by another user.',
  221: 'ERROR_CHECKOUT_REQUIRED: The file must be checked out before saving changes.',
  222: 'ERROR_BAD_FILE_TYPE: The file type being saved or retrieved has been blocked.',
  223: 'ERROR_FILE_TOO_LARGE: The file size exceeds the limit allowed and cannot be saved.',
  224: 'ERROR_FORMS_AUTH_REQUIRED: Access Denied. Before opening files in this location, you must first add the web site to your trusted sites list, browse to the web site, and select the option to login automatically.',
  225: 'ERROR_VIRUS_INFECTED: Operation did not complete successfully because the file contains a virus or potentially unwanted software.',
  226: 'ERROR_VIRUS_DELETED: This file contains a virus or potentially unwanted software and cannot be opened. Due to the nature of this virus or potentially unwanted software, the file has been removed from this location.',
  229: 'ERROR_PIPE_LOCAL: The pipe is local.',
  230: 'ERROR_BAD_PIPE: The pipe state is invalid.',
  231: 'ERROR_PIPE_BUSY: All pipe instances are busy.',
  232: 'ERROR_NO_DATA: The pipe is being closed.',
  233: 'ERROR_PIPE_NOT_CONNECTED: No process is on the other end of the pipe.',
  234: 'ERROR_MORE_DATA: More data is available.',
  240: 'ERROR_VC_DISCONNECTED: The session was canceled.',
  254: 'ERROR_INVALID_EA_NAME: The specified extended attribute name was invalid.',
  255: 'ERROR_EA_LIST_INCONSISTENT: The extended attributes are inconsistent.',
  258: 'WAIT_TIMEOUT: The wait operation timed out.',
  259: 'ERROR_NO_MORE_ITEMS: No more data is available.',
  266: 'ERROR_CANNOT_COPY: The copy functions cannot be used.',
  267: 'ERROR_DIRECTORY: The directory name is invalid.',
  275: 'ERROR_EAS_DIDNT_FIT: The extended attributes did not fit in the buffer.',
  276: 'ERROR_EA_FILE_CORRUPT: The extended attribute file on the mounted file system is corrupt.',
  277: 'ERROR_EA_TABLE_FULL: The extended attribute table file is full.',
  278: 'ERROR_INVALID_EA_HANDLE: The specified extended attribute handle is invalid.',
  282: 'ERROR_EAS_NOT_SUPPORTED: The mounted file system does not support extended attributes.',
  288: 'ERROR_NOT_OWNER: Attempt to release mutex not owned by caller.',
  298: 'ERROR_TOO_MANY_POSTS: Too many posts were made to a semaphore.',
  299: 'ERROR_PARTIAL_COPY: Only part of a ReadProcessMemory or WriteProcessMemory request was completed.',
  300: 'ERROR_OPLOCK_NOT_GRANTED: The oplock request is denied.',
  301: 'ERROR_INVALID_OPLOCK_PROTOCOL: An invalid oplock acknowledgment was received by the system.',
  302: 'ERROR_DISK_TOO_FRAGMENTED: The volume is too fragmented to complete this operation.',
  303: 'ERROR_DELETE_PENDING: The file cannot be opened because it is in the process of being deleted.',
  304: 'ERROR_INCOMPATIBLE_WITH_GLOBAL_SHORT_NAME_REGISTRY_SETTING: Short name settings may not be changed on this volume due to the global registry setting.',
  305: 'ERROR_SHORT_NAMES_NOT_ENABLED_ON_VOLUME: Short names are not enabled on this volume.',
  306: 'ERROR_SECURITY_STREAM_IS_INCONSISTENT: The security stream for the given volume is in an inconsistent state. Please run CHKDSK on the volume.',
  307: 'ERROR_INVALID_LOCK_RANGE: A requested file lock operation cannot be processed due to an invalid byte range.',
  308: 'ERROR_IMAGE_SUBSYSTEM_NOT_PRESENT: The subsystem needed to support the image type is not present.',
  309: 'ERROR_NOTIFICATION_GUID_ALREADY_DEFINED: The specified file already has a notification GUID associated with it.',
  310: 'ERROR_INVALID_EXCEPTION_HANDLER: An invalid exception handler routine has been detected.',
  311: 'ERROR_DUPLICATE_PRIVILEGES: Duplicate privileges were specified for the token.',
  312: 'ERROR_NO_RANGES_PROCESSED: No ranges for the specified operation were able to be processed.',
  313: 'ERROR_NOT_ALLOWED_ON_SYSTEM_FILE: Operation is not allowed on a file system internal file.',
  314: 'ERROR_DISK_RESOURCES_EXHAUSTED: The physical resources of this disk have been exhausted.',
  315: 'ERROR_INVALID_TOKEN: The token representing the data is invalid.',
  316: 'ERROR_DEVICE_FEATURE_NOT_SUPPORTED: The device does not support the command feature.',
  317: 'ERROR_MR_MID_NOT_FOUND: The system cannot find message text for message number 0x%1 in the message file for %2.',
  318: 'ERROR_SCOPE_NOT_FOUND: The scope specified was not found.',
  319: 'ERROR_UNDEFINED_SCOPE: The Central Access Policy specified is not defined on the target machine.',
  320: 'ERROR_INVALID_CAP: The Central Access Policy obtained from Active Directory is invalid.',
  321: 'ERROR_DEVICE_UNREACHABLE: The device is unreachable.',
  322: 'ERROR_DEVICE_NO_RESOURCES: The target device has insufficient resources to complete the operation.',
  323: 'ERROR_DATA_CHECKSUM_ERROR: A data integrity checksum error occurred. Data in the file stream is corrupt.',
  324: 'ERROR_INTERMIXED_KERNEL_EA_OPERATION: An attempt was made to modify both a KERNEL and normal Extended Attribute (EA) in the same operation.',
  326: 'ERROR_FILE_LEVEL_TRIM_NOT_SUPPORTED: Device does not support file-level TRIM.',
  327: "ERROR_OFFSET_ALIGNMENT_VIOLATION: The command specified a data offset that does not align to the device's granularity/alignment.",
  328: 'ERROR_INVALID_FIELD_IN_PARAMETER_LIST: The command specified an invalid field in its parameter list.',
  329: 'ERROR_OPERATION_IN_PROGRESS: An operation is currently in progress with the device.',
  330: 'ERROR_BAD_DEVICE_PATH: An attempt was made to send down the command via an invalid path to the target device.',
  331: 'ERROR_TOO_MANY_DESCRIPTORS: The command specified a number of descriptors that exceeded the maximum supported by the device.',
  332: 'ERROR_SCRUB_DATA_DISABLED: Scrub is disabled on the specified file.',
  333: 'ERROR_NOT_REDUNDANT_STORAGE: The storage device does not provide redundancy.',
  334: 'ERROR_RESIDENT_FILE_NOT_SUPPORTED: An operation is not supported on a resident file.',
  335: 'ERROR_COMPRESSED_FILE_NOT_SUPPORTED: An operation is not supported on a compressed file.',
  336: 'ERROR_DIRECTORY_NOT_SUPPORTED: An operation is not supported on a directory.',
  337: 'ERROR_NOT_READ_FROM_COPY: The specified copy of the requested data could not be read.',
  350: 'ERROR_FAIL_NOACTION_REBOOT: No action was taken as a system reboot is required.',
  351: 'ERROR_FAIL_SHUTDOWN: The shutdown operation failed.',
  352: 'ERROR_FAIL_RESTART: The restart operation failed.',
  353: 'ERROR_MAX_SESSIONS_REACHED: The maximum number of sessions has been reached.',
  400: 'ERROR_THREAD_MODE_ALREADY_BACKGROUND: The thread is already in background processing mode.',
  401: 'ERROR_THREAD_MODE_NOT_BACKGROUND: The thread is not in background processing mode.',
  402: 'ERROR_PROCESS_MODE_ALREADY_BACKGROUND: The process is already in background processing mode.',
  403: 'ERROR_PROCESS_MODE_NOT_BACKGROUND: The process is not in background processing mode.',
  487: 'ERROR_INVALID_ADDRESS: Attempt to access invalid address.',
};

export function getLastCascLibError(): string {
  let errorCode = getCascLib().GetCascError();
  if (typeof errorCode === 'string') {
    errorCode = parseInt(errorCode, 10);
  }

  const message = KnownWindowsErrorCodes[errorCode] ?? `UNKNOWN ERROR`;
  return `CascLib error code ${errorCode}: ${message}`;
}
