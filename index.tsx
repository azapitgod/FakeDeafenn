import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Button, Menu, React } from "@webpack/common";

const MediaEngineActions = findByPropsLazy("toggleSelfMute");
const SelectedChannelStore = findStoreLazy("SelectedChannelStore");

const PLUGIN_VERSION = "1.0.0";
const GITHUB_REPO = "BlockTol/Discord-Fake-Deafen";
const UPDATE_CHECK_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const GITHUB_RELEASE_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
const UPDATE_CHECK_ENABLED = true;



function compareVersions(v1: string, v2: string): number {
    const clean1 = v1.replace(/[^0-9.]/g, '');
    const clean2 = v2.replace(/[^0-9.]/g, '');

    const parts1 = clean1.split('.').map(n => parseInt(n) || 0);
    const parts2 = clean2.split('.').map(n => parseInt(n) || 0);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

async function checkForUpdates(): Promise<void> {
    if (!UPDATE_CHECK_ENABLED) return;

    try {
        const lastDismissed = await DataStore.get("FakeDeafen-dismissed-version") as string | undefined;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(UPDATE_CHECK_URL, {
            signal: controller.signal,
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        clearTimeout(timeoutId);

        if (response.status === 404) return; // Henüz yayınlanan sürüm yok
        if (!response.ok) return;

        const data = await response.json();
        let latestVersion = data.tag_name || data.name || "";
        latestVersion = latestVersion.replace(/^v/i, '').trim();

        if (!latestVersion) return;

        const comparison = compareVersions(latestVersion, PLUGIN_VERSION);

        if (comparison > 0 && lastDismissed !== latestVersion) {
            const releaseNotes = data.body || "Sürüm notu bulunmuyor.";
            showUpdateModal(latestVersion, releaseNotes);
        }
    } catch (e) {
        console.warn("[SahteSağırlaştırma] Güncelleme kontrolü başarısız oldu:", e);
    }
}

const UpdateModal = ({ props, version, releaseNotes }: { props: ModalProps; version: string; releaseNotes: string; }) => {
    const cleanNotes = releaseNotes
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .substring(0, 500);

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div>
                        <div style={{ color: "var(--text-positive)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Güncelleme Mevcut</div>
                        <span style={{ color: "#fff", fontSize: "20px", fontWeight: 600 }}>Sahte Sağırlaştırma</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>v{PLUGIN_VERSION}</span>
                        <span style={{ color: "var(--text-muted)" }}>→</span>
                        <span style={{ background: "var(--text-positive)", color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>v{version}</span>
                    </div>
                </div>
            </ModalHeader>
            <ModalContent>
                <div style={{ padding: "8px 0" }}>
                    <div style={{ background: "var(--background-secondary)", borderRadius: "12px", padding: "16px", maxHeight: "200px", overflowY: "auto" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Yenilikler</div>
                        <div style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-normal)", whiteSpace: "pre-wrap" }}>{cleanNotes}</div>
                    </div>
                </div>
            </ModalContent>
            <ModalFooter>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <Button color={Button.Colors.PRIMARY} onClick={async () => {
                        await DataStore.set('FakeDeafen-dismissed-version', version);
                        props.onClose();
                    }}>
                        Daha Sonra
                    </Button>
                    <Button color={Button.Colors.GREEN} onClick={async () => {
                        window.open(GITHUB_RELEASE_URL, '_blank');
                        await DataStore.set('FakeDeafen-dismissed-version', version);
                        props.onClose();
                    }}>
                        Şimdi Güncelle
                    </Button>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
};

function showUpdateModal(version: string, releaseNotes: string) {
    openModal((modalProps: ModalProps) => (
        <UpdateModal props={modalProps} version={version} releaseNotes={releaseNotes} />
    ));
}



const VersionDisplay = () => {
    const [updateStatus, setUpdateStatus] = React.useState<string | null>(null);

    const checkUpdate = async () => {
        setUpdateStatus("Kontrol ediliyor...");
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(UPDATE_CHECK_URL, {
                signal: controller.signal,
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });

            clearTimeout(timeoutId);

            if (response.status === 404) {
                setUpdateStatus("Henüz yayınlanmış sürüm yok");
                return;
            }

            if (!response.ok) {
                setUpdateStatus("Kontrol başarısız");
                return;
            }

            const data = await response.json();
            let latestVersion = data.tag_name || data.name || "";
            latestVersion = latestVersion.replace(/^v/i, '').trim();

            if (!latestVersion) {
                setUpdateStatus("Sürüm bulunamadı");
                return;
            }

            const comparison = compareVersions(latestVersion, PLUGIN_VERSION);

            if (comparison > 0) {
                setUpdateStatus(`Güncelleme mevcut: v${latestVersion}`);
                setTimeout(() => {
                    showUpdateModal(latestVersion, data.body || "Sürüm notu bulunmuyor.");
                }, 500);
            } else {
                setUpdateStatus("Eklentiniz güncel!");
            }
        } catch (e) {
            setUpdateStatus("Kontrol hatası");
        }
    };

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px",
            background: "var(--background-secondary)",
            borderRadius: "8px",
            marginBottom: "16px"
        }}>
            <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                    Sahte Sağırlaştırma
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Sürüm: <span style={{ color: "#5865f2", fontWeight: 600 }}>v{PLUGIN_VERSION}</span>
                    {updateStatus && (
                        <span style={{
                            marginLeft: "10px",
                            color: updateStatus.includes("mevcut") ? "#43b581" :
                                updateStatus.includes("güncel") ? "#43b581" :
                                    updateStatus.includes("başarısız") || updateStatus.includes("hatası") ? "#f04747" : "var(--text-muted)"
                        }}>
                            • {updateStatus}
                        </span>
                    )}
                </div>
            </div>
            <button
                onClick={checkUpdate}
                disabled={updateStatus === "Kontrol ediliyor..."}
                style={{
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    background: "#5865f2",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: updateStatus === "Kontrol ediliyor..." ? "not-allowed" : "pointer",
                    opacity: updateStatus === "Kontrol ediliyor..." ? 0.7 : 1,
                    transition: "all 0.2s"
                }}
            >
                {updateStatus === "Kontrol ediliyor..." ? "Kontrol ediliyor..." : "Güncellemeleri Denetle"}
            </button>
        </div>
    );
};



function KeybindRecorder({ setValue, option }: { setValue: (v: string) => void; option: { default?: string; }; }) {
    const [recording, setRecording] = React.useState(false);
    const [keybind, setKeybind] = React.useState(settings.store.keybind || "");

    React.useEffect(() => {
        if (!recording) return;

        function onKeyDown(e: KeyboardEvent) {
            e.preventDefault();
            e.stopPropagation();

            if (e.key === "Escape") {
                setRecording(false);
                return;
            }

            if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

            const parts: string[] = [];
            if (e.ctrlKey) parts.push("Ctrl");
            if (e.shiftKey) parts.push("Shift");
            if (e.altKey) parts.push("Alt");
            parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);

            const combo = parts.join("+");
            setKeybind(combo);
            setValue(combo);
            setRecording(false);
        }

        document.addEventListener("keydown", onKeyDown, true);
        return () => document.removeEventListener("keydown", onKeyDown, true);
    }, [recording]);

    return (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
                onClick={() => setRecording(!recording)}
                style={{
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    background: recording ? "#ed4245" : "#5865f2",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "14px",
                    minWidth: "180px"
                }}
            >
                {recording ? "Bir tuş kombinasyonuna basın..." : keybind || "Kısayol atamak için tıklayın"}
            </button>
            {keybind && !recording && (
                <button
                    onClick={() => {
                        setKeybind("");
                        setValue("");
                    }}
                    style={{
                        padding: "8px 12px",
                        borderRadius: "4px",
                        border: "none",
                        background: "#4f545c",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "14px"
                    }}
                >
                    Temizle
                </button>
            )}
        </div>
    );
}



const settings = definePluginSettings({
    versionInfo: {
        type: OptionType.COMPONENT,
        description: "",
        component: VersionDisplay
    },
    fakeDeafen: {
        type: OptionType.BOOLEAN,
        description: "Sahte Sağırlaştırma",
        default: false,
        hidden: true,
    },
    keybind: {
        type: OptionType.COMPONENT,
        description: "Sahte Sağırlaştırmayı açıp kapatmak için kısayol tuşu atayın",
        component: (props) => <KeybindRecorder {...props} />
    }
});



function isInVoiceChannel(): boolean {
    try {
        return !!SelectedChannelStore.getVoiceChannelId();
    } catch {
        return false;
    }
}

function toggleFakeDeafen() {
    settings.store.fakeDeafen = !settings.store.fakeDeafen;
    try {
        MediaEngineActions.toggleSelfDeaf();
        setTimeout(() => {
            try { MediaEngineActions.toggleSelfDeaf(); } catch { }
        }, 50);
    } catch { }
}

function parseKeybind(keybind: string) {
    if (!keybind) return null;

    const parts = keybind.split("+").map(p => p.trim());
    const key = parts.pop()!;
    const modifiers = {
        ctrl: parts.includes("Ctrl"),
        shift: parts.includes("Shift"),
        alt: parts.includes("Alt"),
    };

    return { key, ...modifiers };
}

function handleKeyDown(e: KeyboardEvent) {
    const kb = parseKeybind(settings.store.keybind);
    if (!kb) return;

    if (
        e.key.toLowerCase() === kb.key.toLowerCase() &&
        e.ctrlKey === kb.ctrl &&
        e.shiftKey === kb.shift &&
        e.altKey === kb.alt
    ) {
        e.preventDefault();
        if (!isInVoiceChannel()) return;
        toggleFakeDeafen();
    }
}



export default definePlugin({
    name: "SahteSağırlaştırma",
    description: "Diğer kullanıcılara karşı sağırlaştırma durumunuzu sahte olarak aktif gösterir.",
    authors: [{ id: 1479564510862901248n, name: "Azap" }],
    settings,

    patches: [
        {
            find: ".setSelfMute(this.selfMute",
            replacement: [
                {
                    match: /\.setSelfDeafen\((.+?)\)/g,
                    replace: ".setSelfDeafen($self.isFakeDeafen()?false:$1)"
                }
            ]
        }
    ],

    contextMenus: {
        "audio-device-context"(children) {
            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuCheckboxItem
                    id="vc-fake-deafen"
                    label="Sahte Sağırlaştırma"
                    checked={settings.store.fakeDeafen}
                    disabled={!isInVoiceChannel()}
                    action={toggleFakeDeafen}
                />
            );
        }
    },

    start() {
        document.addEventListener("keydown", handleKeyDown);
        setTimeout(() => checkForUpdates(), 5000);
    },

    stop() {
        document.removeEventListener("keydown", handleKeyDown);
    },

    isFakeDeafen() {
        return settings.store.fakeDeafen;
    }
});