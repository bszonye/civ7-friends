import { ComponentUtilities } from '/core/ui-next/utilities/component-utilities.js';
import { UpdateDiploRibbonEvent } from '/base-standard/ui/diplo-ribbon/model-diplo-ribbon.js';
import { RaiseDiplomacyEvent } from '/base-standard/ui/diplomacy/diplomacy-events.js';
class bzPlayerDiplomacyActionPanel {
  static c;
  constructor(component) {
    this.component = component;
    this.component.bzFriends = this;
    this.patchPrototype(Object.getPrototypeOf(component));
  }
  patchPrototype(proto) {
    if (bzPlayerDiplomacyActionPanel.c) return;  // one-time initialization
    // patch PlayerDiplomacyActionPanel methods & properties
    const c = bzPlayerDiplomacyActionPanel.c = { proto };
    // afterCreateMinorPlayerListItem
    c.createMinorPlayerListItem = c.proto.createMinorPlayerListItem;
    c.proto.createMinorPlayerListItem = function(...args) {
      const [player] = args;
      const item = this.bzFriends.createMinorPlayerListItem(player);
      return this.bzFriends.afterCreateMinorPlayerListItem(item, player);
    }
  }
  beforeAttach() { }
  afterAttach() { }
  beforeDetach()  {}
  afterDetach() { }
  // TRIX: replacement method to fix sorting
  createMinorPlayerListItem(player) {
    const playerListItem = document.createElement("fxs-chooser-item");
    playerListItem.classList.add("flex", "grow", "flex-row", "justify-start", "items-center", "mb-2", "w-136");
    playerListItem.setAttribute("tabindex", "-1");
    playerListItem.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");
    playerListItem.setAttribute("data-audio-activate-ref", "data-audio-leader-response");
    const playerListItemContentContainer = document.createElement("div");
    playerListItemContentContainer.classList.add("flex", "items-center", "size-full");
    playerListItem.appendChild(playerListItemContentContainer);
    const iconContainer = document.createElement("div");
    iconContainer.classList.value = "size-19 flex self-center items-center justify-center relative";
    playerListItemContentContainer.appendChild(iconContainer);
    const iconImage = document.createElement("div");
    iconImage.classList.value = "size-14 -top-px bg-center rounded-full relative flex flex-col items-center bg-cover justify-center";
    iconContainer.appendChild(iconImage);
    const iconFront = document.createElement("div");
    iconFront.classList.value = "absolute img-civics-icon-frame size-19 flex self-center items-center justify-center pointer-events-none relative";
    iconContainer.appendChild(iconFront);
    const independentType = GameInfo.CityStateTypes.lookup(player.getCityStateCityStateType());
    const iconSrc = independentType?.CityStateType ? UI.getIconURL(`CITY_STATE_${independentType?.CityStateType}`) : "blp:leader_portrait_independent";
    iconImage.style.backgroundImage = `url(${iconSrc})`;
    if (independentType && iconSrc) {
      iconContainer.setAttribute("data-tooltip-content", Locale.compose(independentType.Name));
    }
    const getMinorLocation = (playerId) => {
      const player2 = Players.get(playerId);
      if (player2 && player2.Districts) {
        const playerDistricts = player2.Districts.getDistricts();
        if (playerDistricts[0]) {
          const location2 = playerDistricts[0].location;
          const visibility = GameplayMap.getRevealedState(
            GameContext.localObserverID,
            location2.x,
            location2.y
          );
          if (visibility != RevealedStates.HIDDEN) {
            return location2;
          }
        }
      }
    };
    const location = getMinorLocation(player.id);
    if (!location) {
      const unmetIcon = document.createElement("fxs-icon");
      unmetIcon.classList.value = "size-7 absolute bottom-1 left-1 pointer-events-auto";
      unmetIcon.style.backgroundImage = "url(blp:action_explorevariant)";
      unmetIcon.setAttribute("data-tooltip-content", "LOC_DIPLOMACY_ACTION_FAILURE_NO_VISION");
      iconContainer.appendChild(unmetIcon);
    }
    const setUpLeaderIcon = (leaderIcon, playerId) => {
      const localPlayerDiplomacy2 = Players.get(GameContext.localPlayerID)?.Diplomacy;
      if (!localPlayerDiplomacy2) {
        console.error(
          "panel-diplomacy-actions: Attempting to set up a leader icon, but no Diplomacy library for local player!"
        );
        return;
      }
      const hasMet = localPlayerDiplomacy2.hasMet(playerId) || GameContext.localPlayerID == playerId;
      const player2 = Configuration.getPlayer(playerId);
      const leaderType = hasMet ? player2.leaderTypeName : "UNKNOWN_LEADER";
      const leaderColor = UI.Player.getPrimaryColorValueAsString(playerId);
      leaderIcon.setAttribute("leader", leaderType ?? "UNKNOWN_LEADER");
      leaderIcon.setAttribute("bg-color", leaderColor);
    };
    const localPlayerDiplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
    if (player.Influence && player.Influence.getSuzerain() != -1) {
      const suzerain = Configuration.getPlayer(player.Influence.getSuzerain());
      if (suzerain.leaderTypeName) {
        if (!localPlayerDiplomacy) {
          console.error(
            "panel-diplomacy-actions: Attempting to create a suzerain icon, but no Diplomacy library for local player!"
          );
          return playerListItem;
        }
        const suzerainIcon = document.createElement("leader-icon");
        suzerainIcon.classList.add("mr-2", "size-13");
        if (localPlayerDiplomacy.hasMet(suzerain.id) || GameContext.localPlayerID == suzerain.id) {
          suzerainIcon.setAttribute("leader", suzerain.leaderTypeName);
          suzerainIcon.setAttribute(
            "bg-color",
            UI.Player.getPrimaryColorValueAsString(player.Influence.getSuzerain())
          );
          if (GameContext.localPlayerID == suzerain.id) {
            suzerainIcon.setAttribute("data-tooltip-content", "LOC_DIPLOMACY_SUZERAIN_YOU");
          } else {
            const suzerainTooltip = Locale.compose(
              "LOC_DIPLOMACY_SUZERAIN_OTHER",
              suzerain.leaderName ?? ""
            );
            suzerainIcon.setAttribute("data-tooltip-content", suzerainTooltip);
          }
        } else {
          suzerainIcon.setAttribute("leader", "UNKNOWN_LEADER");
          const suzerainTooltip = Locale.compose("LOC_DIPLOMACY_SUZERAIN_OTHER", "LOC_UI_UNMET_PLAYER_NAME");
          suzerainIcon.setAttribute("data-tooltip-content", suzerainTooltip);
        }
        playerListItemContentContainer.appendChild(suzerainIcon);
      }
    }
    const independentLabels = document.createElement("div");
    independentLabels.classList.add("font-title", "text-sm", "flex", "flex-col", "items-start", "justify-center");
    playerListItemContentContainer.appendChild(independentLabels);
    const independentNameContainer = document.createElement("div");
    independentNameContainer.classList.value = "flex flex-row gap-1 items-center";
    independentLabels.appendChild(independentNameContainer);
    const independentName = document.createElement("div");
    independentName.classList.add("pointer-events-none", "font-fit-shrink", "relative");
    independentName.innerHTML = Locale.stylize(player.civilizationFullName);
    independentNameContainer.appendChild(independentName);
    const relationship = localPlayerDiplomacy?.isAtWarWith(player.id);
    if (relationship) {
      const warIcon = document.createElement("fxs-icon");
      warIcon.classList.add("size-5");
      warIcon.setAttribute("data-icon-id", "WAR");
      independentNameContainer.append(warIcon);
      const independentRelation = document.createElement("div");
      independentRelation.classList.value = "font-body text-sm text-accent-3";
      independentRelation.innerHTML = Locale.stylize("LOC_INDEPENDENT_RELATIONSHIP_HOSTILE");
      independentNameContainer.append(independentRelation);
    }
    let hasTooltip = false;
    let bonusDefinition;
    if (player.isMinor) {
      const bonusType = Game.CityStates.getBonusType(player.id);
      bonusDefinition = GameInfo.CityStateBonuses.find((t) => t.$hash == bonusType);
      if (bonusDefinition) {
        const independentBonus = document.createElement("div");
        independentBonus.classList.add("pointer-events-none", "font-fit-shrink", "relative");
        independentBonus.innerHTML = Locale.stylize(bonusDefinition.Name);
        independentLabels.appendChild(independentBonus);
        hasTooltip = true;
      }
    }
    const befriendActions = Game.Diplomacy.getPlayerEvents(player.id).filter((event) => event.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN).sort((a, b) => {
      const actionA = Game.Diplomacy.getCompletionData(a.uniqueID).turnsToCompletion;
      const actionB = Game.Diplomacy.getCompletionData(b.uniqueID).turnsToCompletion;
      // TRIX: fix sorting
      if (actionA != actionB) return actionA - actionB;
      // players who have already acted this turn will lose ties
      const current = GameContext.localPlayerID;
      const pastA = a.initialPlayer <= current;
      const pastB = b.initialPlayer <= current;
      return pastA - pastB;
    });
    const isPlayerBefriending = befriendActions.some((event) => event.initialPlayer == GameContext.localPlayerID);
    if (befriendActions.length > 0) {
      const turnContainer = document.createElement("div");
      turnContainer.classList.value = "absolute flex flex-row-reverse items-center pr-3 right-0 gap-1";
      playerListItemContentContainer.appendChild(turnContainer);
      const leadingAction = befriendActions[0];
      const leaderIconContainer = document.createElement("div");
      leaderIconContainer.classList.value = "relative";
      const leadingIcon = document.createElement("leader-icon");
      leadingIcon.classList.add("size-10");
      setUpLeaderIcon(leadingIcon, leadingAction.initialPlayer);
      leaderIconContainer.appendChild(leadingIcon);
      turnContainer.appendChild(leaderIconContainer);
      if (isPlayerBefriending) {
        if (GameContext.localPlayerID != leadingAction.initialPlayer) {
          const warningIcon = document.createElement("fxs-icon");
          warningIcon.classList.value = "size-8";
          warningIcon.style.backgroundImage = "url(blp:dipaction_befriend_negative)";
          turnContainer.appendChild(warningIcon);
          turnContainer.setAttribute(
            "data-tooltip-content",
            "LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_LOSING"
          );
        } else {
          turnContainer.setAttribute(
            "data-tooltip-content",
            "LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_WINNING"
          );
        }
      }
      const turnTimer = document.createElement("div");
      turnTimer.classList.add("panel-diplomacy-actions__ongoing-action-turn-timer");
      turnContainer.appendChild(turnTimer);
      const turnCount = document.createElement("div");
      turnCount.classList.value = "text-sm font-body";
      turnCount.innerHTML = Game.Diplomacy.getCompletionData(
        befriendActions[0].uniqueID
      ).turnsToCompletion.toString();
      turnContainer.appendChild(turnCount);
      hasTooltip = true;
    }
    if (hasTooltip) {
      const filigreeClasses = [
        "absolute -top-2 -left-2 rotate-180 size-4 bg-contain opacity-30",
        "absolute -top-2 -right-2 -rotate-90 size-4 bg-contain opacity-30",
        "absolute -bottom-2 -left-2 rotate-90 size-4 bg-contain opacity-30",
        "absolute -bottom-2 -right-2 size-4 bg-contain opacity-30"
      ];
      const preloadImages = ["blp:mp_player_detail", "blp:base_ticket-bg"];
      ComponentUtilities.preloadImages(...preloadImages).finally(() => {
        const tooltipDiv = document.createElement("div");
        for (const classString of filigreeClasses) {
          const filigree = document.createElement("div");
          filigree.setAttribute("class", classString);
          filigree.style.backgroundImage = "url(blp:mp_player_detail)";
          tooltipDiv.appendChild(filigree);
        }
        const tooltipContainer = document.createElement("div");
        tooltipContainer.setAttribute("class", "flex flex-col items-center justify-center m-1");
        tooltipDiv.appendChild(tooltipContainer);
        const tooltipName = document.createElement("div");
        tooltipName.setAttribute("class", "text-secondary text-sm font-title uppercase tracking-100");
        tooltipName.innerHTML = Locale.stylize(player.civilizationFullName);
        tooltipContainer.appendChild(tooltipName);
        const ticketClass = "mt-1 p-3 px-6 pb-0 img-base-ticket-bg flex flex-col gap-2";
        if (bonusDefinition) {
          const tooltipHeader = document.createElement("div");
          tooltipHeader.setAttribute("class", "text-sm uppercase");
          tooltipHeader.innerHTML = Locale.stylize("LOC_DIPLOMACY_CHOSEN_BONUS_TITLE");
          tooltipContainer.appendChild(tooltipHeader);
          const tooltipTicket = document.createElement("div");
          tooltipTicket.setAttribute("class", ticketClass);
          const tooltipBonusTitle = document.createElement("div");
          tooltipBonusTitle.setAttribute("class", "text-secondary text-sm font-title uppercase tracking-100");
          tooltipBonusTitle.innerHTML = Locale.stylize(bonusDefinition.Name);
          tooltipTicket.appendChild(tooltipBonusTitle);
          const tooltipBonusDesc = document.createElement("div");
          tooltipBonusDesc.setAttribute("class", "flex flex-col gap-2 -mb-3");
          tooltipBonusDesc.innerHTML = Locale.stylize(bonusDefinition.Description);
          tooltipTicket.appendChild(tooltipBonusDesc);
          tooltipContainer.appendChild(tooltipTicket);
        }
        const localPlayerDiplomacy2 = Players.get(GameContext.localPlayerID)?.Diplomacy;
        if (befriendActions.length > 0 && localPlayerDiplomacy2) {
          const tooltipHeader = document.createElement("div");
          tooltipHeader.setAttribute("class", "text-sm uppercase");
          tooltipHeader.innerHTML = Locale.stylize("LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_PROJECT_NAME");
          tooltipContainer.appendChild(tooltipHeader);
          const tooltipTicket = document.createElement("div");
          tooltipTicket.setAttribute("class", ticketClass);
          tooltipContainer.appendChild(tooltipTicket);
          for (let index = 0; index < befriendActions.length; index++) {
            const action = befriendActions[index];
            const playerEntry = document.createElement("div");
            playerEntry.setAttribute("class", "flex flex-row");
            const playerPlace = document.createElement("div");
            playerPlace.innerHTML = `${index + 1}. `;
            playerEntry.appendChild(playerPlace);
            const playerNameContainer = document.createElement("div");
            const actionPlayer = Configuration.getPlayer(action.initialPlayer);
            const playerString = action.initialPlayer == GameContext.localPlayerID ? "LOC_VICTORY_LEADER_NAME_YOU" : "LOC_VICTORY_LEADER_NAME";
            const playerName = localPlayerDiplomacy2.hasMet(action.initialPlayer) || GameContext.localPlayerID == action.initialPlayer ? actionPlayer.leaderName ?? "LOC_UI_UNMET_PLAYER_NAME" : "LOC_UI_UNMET_PLAYER_NAME";
            playerNameContainer.innerHTML = Locale.compose(playerString, playerName);
            playerEntry.appendChild(playerNameContainer);
            playerEntry.classList.add(
              action.initialPlayer == GameContext.localPlayerID ? "" : "opacity-60"
            );
            const spacer = document.createElement("div");
            spacer.setAttribute("class", "min-w-10 grow");
            playerEntry.appendChild(spacer);
            const turnsLeft = Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion;
            const turnsContainer = document.createElement("div");
            turnsContainer.innerHTML = Locale.compose("LOC_NARRATIVE_TURN_TIMER", turnsLeft);
            playerEntry.appendChild(turnsContainer);
            if (index != 0) {
              const dividerCont = document.createElement("div");
              const divider = document.createElement("div");
              dividerCont.setAttribute("class", "flex flex-row");
              divider.setAttribute("class", "grow h-px");
              divider.style.background = "rgba(77, 83, 102, 0.70)";
              dividerCont.appendChild(divider);
              tooltipTicket.appendChild(dividerCont);
            }
            tooltipTicket.appendChild(playerEntry);
          }
          const leadingAction = befriendActions[0];
          if (isPlayerBefriending && GameContext.localPlayerID != leadingAction.initialPlayer) {
            const warningDiv = document.createElement("div");
            warningDiv.classList.value = "-mx-2 mt-2 p-2 flex flex-col text-negative";
            warningDiv.style.backgroundColor = "rgba(0,0,0,0.4)";
            warningDiv.innerHTML = Locale.compose("LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_LOSING");
            tooltipTicket.appendChild(warningDiv);
          } else {
            const lastChild = tooltipTicket.lastChild;
            lastChild?.classList.add("-mb-2");
          }
        }
        playerListItem.setAttribute("data-tooltip-content", tooltipDiv.outerHTML);
        playerListItem.setAttribute("data-tooltip-anchor", "left");
        playerListItem.setAttribute("data-tooltip-anchor-offset", "10");
      });
    }
    playerListItem.addEventListener("action-activate", () => {
      window.dispatchEvent(new RaiseDiplomacyEvent(player.id));
      window.dispatchEvent(new UpdateDiploRibbonEvent());
      const location2 = getMinorLocation(player.id);
      if (location2) {
        Camera.lookAtPlot(location2);
      }
    });
    return playerListItem;
  }
  afterCreateMinorPlayerListItem(item, player) {
    // adjust vanilla styling
    const content = item.firstChild;
    const civIcon = content.firstChild;
    // red glow for hostile minors
    const observer = Players.get(GameContext.localObserverID);
    const isEnemy = player.Diplomacy?.isAtWarWith(observer.id);
    civIcon.style.filter = isEnemy ?
      "drop-shadow(0 0 0.333rem #ff4b44) drop-shadow(0 0 0.222rem #af1b1c)" :
      "drop-shadow(0 0.222rem 0.111rem #0006)";
    // show crisis icons for encampments
    const type = GameInfo.CityStateTypes.lookup(player.getCityStateCityStateType());
    if (!type) {  // crisis encampment
      const icon = civIcon.firstChild;
      icon.style.backgroundImage = "url('blp:bonustype_crisis')";
      icon.style.filter = "fxs-color-tint(#af1b1c)";
      icon.classList.add("bg-black", "rounded-full");
    }
    // show warning icon for broken independents
    const bonusType = Game.CityStates.getBonusType(player.id);
    if (type && bonusType != -1 && player.isIndependent) {
      const warningIcon = document.createElement("div");
      warningIcon.classList.value =
        "absolute mr-2 size-9 bg-cover bg-no-repeat";
      warningIcon.style.backgroundImage = UI.getIconCSS("ATTENTION");
      warningIcon.style.filter = "drop-shadow(0 0.22rem 0.11rem black)";
      warningIcon.setAttribute(
        "data-tooltip-content", "LOC_BZ_WARNING_RESPAWNED_INDEPENDENT"
      );
      civIcon.appendChild(warningIcon);
    }
    return item;
  }
}
Controls.decorate("panel-player-diplomacy-actions", (c) => new bzPlayerDiplomacyActionPanel(c));
