class bzPlayerDiplomacyActionPanel {
    static c_prototype;
    locations = new Map();
    constructor(component) {
        this.component = component;
        component.bzComponent = this;
        this.patchPrototypes(this.component);
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzPlayerDiplomacyActionPanel.c_prototype == c_prototype) return;
        // patch component methods
        const proto = bzPlayerDiplomacyActionPanel.c_prototype = c_prototype;
        // afterCreateMinorPlayerListItem
        const afterCreateMinorPlayerListItem = this.afterCreateMinorPlayerListItem;
        const createMinorPlayerListItem = proto.createMinorPlayerListItem;
        proto.createMinorPlayerListItem = function(...args) {
            const item = createMinorPlayerListItem.apply(this, args);
            args = [item, ...args];
            return afterCreateMinorPlayerListItem.apply(this.bzComponent, args);
        }
    }
    beforeAttach() {
        this.locations.clear();
        for (const player of Players.getAlive()) {
            if (player.isIndependent) {
                const loc = player.Constructibles?.getConstructibles().find(cons => {
                    const info = GameInfo.Constructibles.lookup(cons.type);
                    return info?.ConstructibleType == "IMPROVEMENT_VILLAGE" ||
                        info?.ConstructibleType == "IMPROVEMENT_ENCAMPMENT";
                })?.location;
                this.locations.set(player.id, loc);
            } else {
                const cities = player.Cities?.getCities();
                const loc = cities?.at(0)?.location;
                this.locations.set(player.id, loc);
            }
        }
    }
    afterAttach() { }
    beforeDetach()  {}
    afterDetach() { }
    afterCreateMinorPlayerListItem(item, player) {
        const column = document.createElement("div");
        column.classList.value =
            "basis-full shrink flex flex-row flex-row-reverse justify-start items-center";
        const observer = Players.get(GameContext.localObserverID);
        const isEnemy = player.Diplomacy?.isAtWarWith(observer.id);
        // adjust vanilla styling
        const content = item.firstChild;
        const civIcon = content.firstChild;
        const suzIcon = content.querySelector("leader-icon");
        // const civName = content.querySelector(".font-title");
        civIcon.style.filter = isEnemy ?
            "drop-shadow(0 0 0.333rem #ff4b44) drop-shadow(0 0 0.222rem #af1b1c)" :
            "drop-shadow(0 0.222rem 0.111rem #0006)";
        suzIcon?.classList.remove("mt-2");
        // show crisis icons
        const type = GameInfo.CityStateTypes.lookup(player.getCityStateCityStateType());
        if (!type) {  // crisis encampment
            const icon = civIcon.firstChild;
            icon.style.backgroundImage = "url('blp:bonustype_crisis')";
            icon.style.filter = "fxs-color-tint(#af1b1c)";
            icon.classList.add("bg-black", "rounded-full");
        }
        // show city-state bonus in tooltip
        const bonusType = Game.CityStates.getBonusType(player.id);
        const bonus = GameInfo.CityStateBonuses.lookup(bonusType);
        if (bonus) {
            const name = Locale.compose(bonus.Name);
            const desc = Locale.compose(bonus.Description);
            // style the tooltip text to fix fonticon alignment
            const tooltip = `[b]${name}[/b][n]${desc}`
                .split(/\[[Nn]\]/)
                .map(s => `[style:leading-normal]${s}[/style]`)
                .join("[n]");
            item.setAttribute("data-tooltip-content", tooltip);
            // show warning icon for broken independents
            if (player.isIndependent) {
                const warningIcon = document.createElement("div");
                warningIcon.classList.value =
                    "relative mr-2 size-13 bg-cover bg-no-repeat";
                warningIcon.style.backgroundImage = UI.getIconCSS("ATTENTION");
                warningIcon.style.filter = "drop-shadow(0 0.22rem 0.11rem black)";
                warningIcon.setAttribute(
                    "data-tooltip-content", "LOC_BZ_WARNING_RESPAWNED_INDEPENDENT"
                );
                column.appendChild(warningIcon);
            }
        }
        // show befriending status
        const befriendType = DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
        const actions = Game.Diplomacy.getPlayerEvents(player.id)
            .filter(act => act.actionType == befriendType);
        if (actions.length) {
            // hide vanilla status icons
            const rivals = content.querySelector(".absolute.flex-row-reverse");
            if (rivals) rivals.style.display = "none";
        }
        const befriending = [];
        for (const act of actions) {
            const target = Players.get(act.targetPlayer);
            if (target.Influence?.hasSuzerain) continue;
            const player = Configuration.getPlayer(act.initialPlayer);
            const cdata = Game.Diplomacy.getCompletionData(act.uniqueID);
            const turns = cdata.turnsToCompletion;
            const order = player.id <= observer.id ? player.id + 1000 : player.id;
            befriending.push({ target, player, turns, order });
        }
        befriending.sort((a, b) => a.turns - b.turns || a.order - b.order);
        const diplomacy = observer.Diplomacy;
        for (const friend of befriending) {
            const friendIcon = document.createElement("leader-icon");
            friendIcon.classList.value = "relative mr-2 size-13";
            // note: the Befriending panel reveals unmet leaders, oops
            if (diplomacy.hasMet(friend.player.id) || friend.player.id == observer.id) {
                friendIcon.setAttribute("leader", friend.player.leaderTypeName);
                friendIcon.setAttribute(
                    "bg-color",
                    UI.Player.getPrimaryColorValueAsString(friend.player.id)
                );
            } else {
                friendIcon.setAttribute("leader", "LEADER_UNMET");
            }
            const friendTurns = document.createElement("div");
            friendTurns.classList.value =
                "absolute -bottom-2 font-body-xs leading-tight bg-accent-2 px-1 z-1";
            friendTurns.style.paddingLeft = friendTurns.style.paddingRight = "0.25em";
            friendTurns.style.backgroundColor = "#000c";
            friendTurns.style.borderRadius = "0.375em";
            friendTurns.textContent = friend.turns.toString();
            friendIcon.appendChild(friendTurns);
            column.appendChild(friendIcon);
        }
        content.appendChild(column);
        // pan to civ location when activated
        item.addEventListener("action-activate", () => {
            const loc = this.locations.get(player.id);
            if (!loc) return;
            const revealed = GameplayMap.getRevealedState(observer.id, loc.x, loc.y);
            if (revealed == RevealedStates.HIDDEN) return;
            Camera.lookAtPlot(loc);
        });
        return item;
    }
}
Controls.decorate("panel-player-diplomacy-actions", (c) => new bzPlayerDiplomacyActionPanel(c));
